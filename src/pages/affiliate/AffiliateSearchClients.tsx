import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Copy, Phone, MapPin, Globe, ExternalLink, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PlaceResult {
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  maps_url: string;
}

const BUSINESS_TYPES = [
  "restaurantes",
  "mercados",
  "oficinas",
  "clínicas",
  "academias",
  "lojas",
  "salões",
  "barbearias",
  "estéticas",
  "consultórios",
  "petshops",
  "escolas",
  "farmácias",
  "padarias",
  "pizzarias",
];

const AffiliateSearchClients = () => {
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [remainingSearches, setRemainingSearches] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const handleSearch = async () => {
    if (!city.trim() || !type) {
      toast.error("Preencha a cidade e o tipo de empresa.");
      return;
    }

    setLoading(true);
    setResults([]);
    setLimitReached(false);

    try {
      const { data, error } = await supabase.functions.invoke("search-places", {
        body: { city: city.trim(), type },
      });

      if (error) {
        // Check if it's a limit error from the function
        if (error.message?.includes("429")) {
          setLimitReached(true);
          toast.error("Você atingiu o limite diário de buscas. Volte amanhã.");
          return;
        }
        throw error;
      }

      if (data?.limit_reached) {
        setLimitReached(true);
        toast.error("Você atingiu o limite diário de buscas. Volte amanhã.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResults(data?.results || []);
      setRemainingSearches(data?.remaining_searches ?? null);

      if ((data?.results || []).length === 0) {
        toast.info("Nenhum resultado encontrado para essa busca.");
      } else {
        toast.success(`${data.results.length} empresas encontradas!`);
      }
    } catch (err: any) {
      console.error("Search error:", err);
      toast.error("Erro ao buscar empresas.");
    } finally {
      setLoading(false);
    }
  };

  const copyContact = (place: PlaceResult) => {
    const parts = [place.name];
    if (place.phone) parts.push(`Tel: ${place.phone}`);
    if (place.address) parts.push(`End: ${place.address}`);
    if (place.website) parts.push(`Site: ${place.website}`);
    parts.push(`Maps: ${place.maps_url}`);

    navigator.clipboard.writeText(parts.join("\n"));
    toast.success("Contato copiado!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Encontre potenciais clientes na sua cidade para oferecer o sistema Zaro.
          </p>

          {limitReached && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você atingiu o limite diário de buscas. Volte amanhã.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Cidade</Label>
              <Input
                placeholder="Ex: São Paulo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <Label>Tipo de empresa</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={loading || limitReached}
                className="w-full"
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>

          {remainingSearches !== null && (
            <p className="text-xs text-muted-foreground">
              Buscas restantes hoje: <strong>{remainingSearches}</strong> / 20
            </p>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resultados ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((place, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3"
                >
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-sm">{place.name}</h3>
                    {place.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {place.address}
                      </p>
                    )}
                    {place.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {place.phone}
                      </p>
                    )}
                    {place.website && (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        <Globe className="h-3 w-3" />
                        {place.website.length > 40
                          ? place.website.substring(0, 40) + "..."
                          : place.website}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(place.maps_url, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Maps
                    </Button>
                    <Button size="sm" onClick={() => copyContact(place)}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar Contato
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AffiliateSearchClients;
