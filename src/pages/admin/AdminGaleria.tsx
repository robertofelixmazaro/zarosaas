import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Upload, GripVertical, Image, Video, Plus } from "lucide-react";

interface GalleryItem {
  id: string;
  title: string | null;
  media_url: string;
  media_type: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

const AdminGaleria = () => {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["gallery_items", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("gallery_items" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as any as GalleryItem[]) || [];
    },
    enabled: !!tenantId,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isVideo && !isImage) {
          toast.error(`Arquivo "${file.name}" não é uma imagem ou vídeo.`);
          continue;
        }

        const ext = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("gallery-media")
          .upload(fileName, file);
        if (uploadError) {
          toast.error(`Erro ao enviar "${file.name}": ${uploadError.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("gallery-media")
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from("gallery_items" as any)
          .insert({
            media_url: urlData.publicUrl,
            media_type: isVideo ? "video" : "image",
            title: file.name.replace(/\.[^/.]+$/, ""),
            sort_order: items.length,
            tenant_id: tenantId,
          } as any);

        if (insertError) {
          toast.error(`Erro ao salvar "${file.name}": ${insertError.message}`);
          continue;
        }
      }

      toast.success("Mídia enviada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["gallery_items"] });
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!confirm("Deseja remover este item da galeria?")) return;
    try {
      // Extract file name from URL
      const urlParts = item.media_url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      await supabase.storage.from("gallery-media").remove([fileName]);
      await supabase.from("gallery_items" as any).delete().eq("id", item.id);
      toast.success("Item removido!");
      queryClient.invalidateQueries({ queryKey: ["gallery_items"] });
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    }
  };

  const handleTitleChange = async (id: string, title: string) => {
    await supabase.from("gallery_items" as any).update({ title } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["gallery_items"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Galeria</h2>
          <p className="text-muted-foreground">Gerencie fotos e vídeos exibidos na landing page</p>
        </div>
        <label>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button asChild disabled={uploading}>
            <span className="cursor-pointer gap-2">
              {uploading ? (
                <>Enviando...</>
              ) : (
                <><Plus className="h-4 w-4" /> Adicionar Mídia</>
              )}
            </span>
          </Button>
        </label>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border rounded-lg border-dashed">
          <Image className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">Nenhuma mídia na galeria</p>
          <p className="text-sm">Clique em "Adicionar Mídia" para enviar fotos e vídeos</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border bg-card overflow-hidden group">
              <div className="relative aspect-video bg-muted">
                {item.media_type === "video" ? (
                  <video
                    src={item.media_url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={item.media_url}
                    alt={item.title || "Galeria"}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2 left-2">
                  {item.media_type === "video" ? (
                    <span className="bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Video className="h-3 w-3" /> Vídeo
                    </span>
                  ) : (
                    <span className="bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Image className="h-3 w-3" /> Foto
                    </span>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-3">
                <Input
                  defaultValue={item.title || ""}
                  placeholder="Título (opcional)"
                  className="text-sm"
                  onBlur={(e) => handleTitleChange(item.id, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminGaleria;
