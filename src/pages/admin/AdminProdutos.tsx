import { useEffect, useState, useRef } from "react";
import { fetchProducts, createProduct, updateProduct, deleteProduct, DbProduct } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Package, Upload, X, Image } from "lucide-react";
import { toast } from "sonner";
import { validateImage, optimizeImage, IMAGE_PRESETS } from "@/lib/imageOptimizer";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(100),
  description: z.string().trim().max(500).optional(),
  price: z.number().min(0.01, "Preço deve ser maior que 0"),
  stock: z.number().int().min(0, "Estoque não pode ser negativo"),
  active: z.boolean(),
});

const emptyForm = { name: "", description: "", price: 0, stock: 0, active: true };

const AdminProdutos = () => {
  const { tenantId } = useTenant();
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const data = await fetchProducts(tenantId || undefined);
    setProducts(data); setLoading(false);
  };

  useEffect(() => { if (tenantId) loadData(); }, [tenantId]);

  const openCreate = () => {
    setForm(emptyForm); setEditingId(null); setErrors({});
    setImageFile(null); setImagePreview(null); setCurrentImageUrl(null);
    setDialogOpen(true);
  };

  const openEdit = (p: DbProduct) => {
    setForm({ name: p.name, description: p.description || "", price: Number(p.price), stock: p.stock, active: p.active });
    setEditingId(p.id); setErrors({});
    setImageFile(null); setImagePreview(null);
    setCurrentImageUrl(p.image_url || null);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return currentImageUrl;
    const ext = imageFile.name.split(".").pop();
    const path = `${productId}.${ext}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, imageFile, { upsert: true });

    if (error) throw error;

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    return data.publicUrl;
  };

  const handleSave = async () => {
    const parsed = productSchema.safeParse({ ...form, price: Number(form.price), stock: Number(form.stock) });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors); return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const imageUrl = await uploadImage(editingId);
        await updateProduct(editingId, { ...parsed.data, image_url: imageUrl } as any);
        toast.success("Produto atualizado!");
      } else {
        // Create product first to get ID, then upload image
        const { data: newProduct, error } = await supabase
          .from("products" as any)
          .insert({ ...parsed.data, tenant_id: tenantId } as any)
          .select("id")
          .single();
        if (error) throw error;

        if (imageFile && newProduct) {
          const imageUrl = await uploadImage((newProduct as any).id);
          await updateProduct((newProduct as any).id, { image_url: imageUrl } as any);
        }
        toast.success("Produto criado!");
      }
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    try {
      await deleteProduct(id);
      toast.success("Produto excluído!");
      loadData();
    } catch (err: any) {
      toast.error("Erro ao excluir", { description: err.message });
    }
  };

  const displayImage = imagePreview || currentImageUrl;

  if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Produtos</h2>
          <p className="text-sm text-muted-foreground">Gerencie seu catálogo</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="rounded-lg border bg-card overflow-hidden group hover:shadow-md transition-shadow">
            {p.image_url ? (
              <div className="w-full h-40 bg-muted">
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-40 bg-muted flex items-center justify-center">
                <Package className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}
            <div className="p-5">
              <h3 className="font-semibold mb-1">{p.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold">R$ {Number(p.price).toFixed(0)}</span>
                <span className={`text-xs px-2 py-1 rounded ${p.stock < 15 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                  Estoque: {p.stock}
                </span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="flex-1 gap-1" onClick={() => openEdit(p)}><Edit className="h-3 w-3" /> Editar</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Imagem do produto</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {displayImage ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-muted">
                  <img src={displayImage} alt="Preview" className="w-full h-full object-cover" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => { setImageFile(null); setImagePreview(null); setCurrentImageUrl(null); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 gap-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3 w-3" /> Trocar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2 hover:border-muted-foreground/40 transition-colors"
                >
                  <Image className="h-8 w-8 text-muted-foreground/40" />
                  <span className="text-sm text-muted-foreground">Clique para enviar uma imagem</span>
                </button>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Nome *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do produto" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição do produto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Preço (R$) *</label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} min={0} step={0.01} />
                {errors.price && <p className="text-xs text-destructive mt-1">{errors.price}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Estoque *</label>
                <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} min={0} />
                {errors.stock && <p className="text-xs text-destructive mt-1">{errors.stock}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} id="prod-active" className="rounded" />
              <label htmlFor="prod-active" className="text-sm">Produto ativo</label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProdutos;
