import { useState, useEffect } from "react";
import { Search, MapPin, Star, Store, ArrowRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { getNicheLabels, type BusinessNiche } from "@/lib/nicheLabels";

interface MarketplaceListing {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  marketplace_logo_url: string | null;
  city: string | null;
  niche: string | null;
  avg_rating: number;
}

const nicheLabelsMap: Record<string, string> = {
  barbershop: "Barbearia",
  salon: "Salão de Beleza",
  clinic: "Clínica",
  consulting: "Consultoria",
  other: "Outros",
};

const ExploreMarketplace = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);

  useEffect(() => {
    const fetchListings = async () => {
      const { data, error } = await supabase.rpc("get_marketplace_listings" as any);
      if (!error && data) {
        setListings(data as unknown as MarketplaceListing[]);
        setFilteredListings(data as unknown as MarketplaceListing[]);
      }
      setLoading(false);
    };
    fetchListings();
  }, []);

  useEffect(() => {
    let result = listings;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.city?.toLowerCase().includes(term) ||
          nicheLabelsMap[l.niche || "other"]?.toLowerCase().includes(term)
      );
    }
    if (selectedNiche) {
      result = result.filter((l) => l.niche === selectedNiche);
    }
    setFilteredListings(result);
  }, [searchTerm, selectedNiche, listings]);

  const niches = [...new Set(listings.map((l) => l.niche || "other"))];

  const handleSchedule = (slug: string) => {
    window.open(`https://${slug}.zarosistemas.com.br`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
        <div className="container mx-auto px-4 py-6">
          <Link to="/" className="flex items-center gap-2 mb-6">
            <img src="/zaro-favicon.png" alt="Zaro" className="h-8 w-8" />
            <span className="font-bold text-xl">Zaro Agendamentos</span>
          </Link>
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Marketplace</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Encontre e agende com as melhores empresas
            </h1>
            <p className="text-muted-foreground text-lg">
              Descubra barbearias, salões, clínicas e muito mais. Agende online em segundos.
            </p>
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cidade ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedNiche === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedNiche(null)}
            >
              Todos
            </Button>
            {niches.map((niche) => (
              <Button
                key={niche}
                variant={selectedNiche === niche ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedNiche(niche)}
              >
                {nicheLabelsMap[niche] || niche}
              </Button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-10 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <Store className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma empresa encontrada</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros ou buscar por outro termo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card
                key={listing.id}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    {listing.logo_url ? (
                      <img
                        src={listing.logo_url}
                        alt={listing.name}
                        className="w-16 h-16 rounded-xl object-contain border-2 border-border bg-background p-1"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center border-2 border-border">
                        <Store className="h-7 w-7 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                        {listing.name}
                      </h3>
                      {listing.city && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {listing.city}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {nicheLabelsMap[listing.niche || "other"] || listing.niche}
                        </Badge>
                        {listing.avg_rating > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-medium">{listing.avg_rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2 group-hover:gap-3 transition-all platform-btn-primary"
                    onClick={() => handleSchedule(listing.slug)}
                  >
                    Agendar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {!loading && filteredListings.length > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            Mostrando {filteredListings.length} empresa{filteredListings.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* CTA Section */}
      <section className="border-t bg-muted/30 mt-12">
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold mb-3">Tem um negócio?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Cadastre sua empresa no Zaro e apareça para milhares de clientes em busca de agendamentos.
          </p>
          <Link to="/cadastrar">
            <Button size="lg" className="gap-2">
              Criar minha agenda online
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ExploreMarketplace;
