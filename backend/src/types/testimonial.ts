export interface Testimonial {
  id: number;
  name: string;
  story: string;
  category: string | null;
  submitted_at: string;
}

export interface CreateTestimonialInput {
  name: string;
  story: string;
  category?: string;
}
