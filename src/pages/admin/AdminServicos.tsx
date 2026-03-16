import { useEffect, useState, useRef } from "react";
import { fetchAllServices, createService, updateService, deleteService, DbService } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Upload, ImageIcon, X, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { validateImage } from "@/lib/imageOptimizer";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(100),
  description: z.string().trim().max(500).optional(),
  price: z.number().min(0.01, "Preço deve ser maior que 0"),
  duration_minutes: z.number().int().min(5, "Mínimo 5 minutos").max(480),
  icon: z.string().trim().max(10).optional(),
  active: z.boolean(),
});

const emptyForm = { name: "", description: "", price: 0, duration_minutes: 30, icon: "✂️", active: true, is_full_day: false, commission_percentage: 0 };

const AdminServicos = () => {
  const { tenantId } = useTenant();
  const { canAddService, limits } = usePlanLimits();
  const [services, setServices] = useState<DbService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const data = await fetchAllServices(tenantId || undefined);
    setServices(data);
    setLoading(false);
  };

  useEffect(() => { if (tenantId) loadData(); }, [tenantId]);

  const openCreate = () => {
    if (!canAddService()) {
      toast.error(`Limite de ${limits.maxServices} serviços atingido. Faça upgrade do seu plano.`);
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
    setImageFile(null);
    setImagePreview(null);
    setAspectWarning(false);
    setDialogOpen(true);
  };

  const openEdit = (s: DbService) => {
    setForm({ name: s.name, description: s.description || "", price: Number(s.price), duration_minutes: s.duration_minutes, icon: s.icon || "✂️", active: s.active, is_full_day: s.is_full_day || false, commission_percentage: s.commission_percentage || 0 });
    setEditingId(s.id);
    setErrors({});
    setImageFile(null);
    setImagePreview(s.image_url || null);
    setAspectWarning(false);
    setDialogOpen(true);
  };

  const [aspectWarning, setAspectWarning] = useState(false);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImage(file, "service");
    if (!validation.valid) { toast.error(validation.error!); return; }

    // Check aspect ratio
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      const is16by9 = Math.abs(ratio - 16 / 9) < 0.1;
      setAspectWarning(!is16by9);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (serviceId: string): Promise<string | null> => {
    if (!imageFile) return null;
    setUploading(true);
    const ext = imageFile.name.split(".").pop();
    const path = `${serviceId}.${ext}`;

    const { error } = await supabase.storage
      .from("service-images")
      .upload(path, imageFile, { upsert: true });

    setUploading(false);
    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("service-images")
      .getPublicUrl(path);

    return `${urlData.publicUrl}?t=${Date.now()}`;
  };

  const handleSave = async () => {
    const parsed = serviceSchema.safeParse({ ...form, price: Number(form.price), duration_minutes: Number(form.duration_minutes) });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        let imageUrl: string | null | undefined = undefined;
        if (imageFile) {
          imageUrl = await uploadImage(editingId);
        }
        await updateService(editingId, { ...parsed.data, is_full_day: form.is_full_day, commission_percentage: form.commission_percentage, ...(imageUrl !== undefined ? { image_url: imageUrl } : {}) });
        toast.success("Serviço atualizado!");
      } else {
        // Create first, then upload image
        const { data: created, error } = await supabase.from("services" as any).insert({ ...parsed.data, is_full_day: form.is_full_day, commission_percentage: form.commission_percentage, tenant_id: tenantId } as any).select("id").single();
        if (error) throw error;
        const newId = (created as any).id;
        if (imageFile) {
          const imageUrl = await uploadImage(newId);
          if (imageUrl) {
            await updateService(newId, { image_url: imageUrl });
          }
        }
        toast.success("Serviço criado!");
      }
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    }
    setSaving(false);
  };

  const handleRemoveImage = async (serviceId: string) => {
    try {
      await updateService(serviceId, { image_url: null } as any);
      toast.success("Imagem removida!");
      loadData();
    } catch (err: any) {
      toast.error("Erro ao remover imagem");
    }
  };

  const quickUploadRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleQuickUpload = async (serviceId: string, file: File) => {
    const validation = validateImage(file, "service");
    if (!validation.valid) { toast.error(validation.error!); return; }
    try {
      const ext = file.name.split(".").pop();
      const path = `${serviceId}.${ext}`;
      const { error } = await supabase.storage.from("service-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("service-images").getPublicUrl(path);
      const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await updateService(serviceId, { image_url: imageUrl });
      toast.success("Imagem enviada!");
      loadData();
    } catch (err: any) {
      toast.error("Erro ao enviar imagem", { description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este serviço?")) return;
    try {
      await deleteService(id);
      toast.success("Serviço excluído!");
      loadData();
    } catch (err: any) {
      toast.error("Erro ao excluir", { description: err.message });
    }
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Serviços</h2>
          <p className="text-sm text-muted-foreground">Gerencie os serviços oferecidos</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((s) => (
          <div key={s.id} className="rounded-xl border bg-card group hover:shadow-lg transition-all duration-300 overflow-hidden">
            {/* Image with 16:9 ratio */}
            <div className="relative w-full bg-muted" style={{ aspectRatio: '16 / 9' }}>
              {s.image_url ? (
                <>
                  <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
                  <button
                    onClick={() => handleRemoveImage(s.id)}
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors bg-muted/30"
                  onClick={() => quickUploadRefs.current[s.id]?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground/50">Enviar foto</span>
                  <input
                    ref={(el) => { quickUploadRefs.current[s.id] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleQuickUpload(s.id, file);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
              {/* Status badge */}
              <div className="absolute top-2.5 left-2.5">
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{
                    background: s.active ? '#16a34a' : 'hsl(var(--muted))',
                    color: s.active ? '#fff' : 'hsl(var(--muted-foreground))',
                    fontSize: '12px',
                  }}
                >
                  {s.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              {/* Name overlay at bottom of image */}
              {s.image_url && (
                <div className="absolute bottom-2.5 left-3 right-3">
                  <span className="text-base font-bold text-white drop-shadow-md">{s.icon} {s.name}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              {!s.image_url && (
                <h3 className="font-semibold mb-1 text-base">{s.icon} {s.name}</h3>
              )}
              {s.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{s.description}</p>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold" style={{ fontSize: '22px', color: '#22c55e' }}>
                  R$ {Number(s.price).toFixed(0)}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  ⏱ {s.is_full_day ? "Dia inteiro" : `${s.duration_minutes} min`}
                </span>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => openEdit(s)}>
                  <Edit className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* Image upload */}
            <div>
              <label className="text-sm font-medium mb-1 block">Imagem do Serviço</label>
              <p className="text-xs text-muted-foreground mb-2">Tamanho recomendado da imagem: 1200 × 700 pixels (proporção 16:9)</p>
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full rounded" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1"
                      onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); setAspectWarning(false); }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground py-2">
                    <Upload className="h-6 w-6" />
                    <span className="text-sm">Clique para enviar uma foto</span>
                    <span className="text-xs">Formatos: JPG, PNG ou WEBP | Máx: 5MB</span>
                  </div>
                )}
              </div>
              {aspectWarning && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">⚠️ Recomendamos usar imagem na proporção 16:9 para melhor visualização.</p>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Nome *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Corte Masculino" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição do serviço" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Preço (R$) *</label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} min={0} step={0.01} />
                {errors.price && <p className="text-xs text-destructive mt-1">{errors.price}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Duração (min) *</label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} min={5} />
                {errors.duration_minutes && <p className="text-xs text-destructive mt-1">{errors.duration_minutes}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ícone</label>
                <Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} maxLength={10} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_full_day} onChange={e => setForm({ ...form, is_full_day: e.target.checked, ...(e.target.checked ? { duration_minutes: 480 } : {}) })} id="is_full_day" className="rounded" />
              <label htmlFor="is_full_day" className="text-sm">Serviço de dia inteiro</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} id="active" className="rounded" />
              <label htmlFor="active" className="text-sm">Serviço ativo</label>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving || uploading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminServicos;
