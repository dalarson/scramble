export interface PlayerDrinkStats {
  playerId: string;
  playerName: string;
  teamName: string;
  playerPhotoUrl: string | null;
  beerHandicap: number | null;
  beers: number;
  netBeerBonus: number;
  birdieJuice: number;
  totalDrinks: number;
}
