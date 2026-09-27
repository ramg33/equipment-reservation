export interface LocationOption {
  id: string;
  name: string;
  equipment: Array<{
    id: string;
    name: string;
    totalQuantity: number;
  }>;
}
