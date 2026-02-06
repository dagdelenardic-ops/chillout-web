export type SiteSource = "eksi" | "global";

export type DiscoverySite = {
  id: string;
  name: string;
  url: string;
  description: string;
  source: SiteSource;
  vibe: "rahatlatici" | "sasirtici" | "oyunlu" | "kesif";
};
