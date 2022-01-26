export type RatingIndex = 1 | 2 | 3;
export type RatingLetter = "e" | "t" | "a";
export type RatingLabel = "everyone" | "teen" | "adult";
export interface Predictions {
    teen: number;
    everyone: number;
    adult: number;
}
export interface Result {
    url_classified: string;
    rating_index: RatingIndex;
    rating_letter: RatingLetter;
    predictions: Predictions;
    rating_label: RatingLabel;
    error_code: number;
    error?: string;
}