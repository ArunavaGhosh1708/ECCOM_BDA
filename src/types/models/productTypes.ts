export interface ProductAttributes {
    id?: number;
    name: string;
    price: number;
    category: string;
    sizes?: string[];
    shortDescription: string;
    longDescription?: string;
    available: boolean;
    imageURL: string;
}

export interface CategoryAndSizeCount {
    categoriesCount: Record<string, number>;
    sizesCount: Record<string, number>;
}
