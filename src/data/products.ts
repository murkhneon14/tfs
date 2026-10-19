export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  hoverImage?: string;
  note: string;
  color: string;
};

// Demo catalog. Replace this module with a Supabase query when the inventory table is ready.
export const products: Product[] = [
  { id: "maggi", name: "2X Hot & Spicy Maggi", category: "Grocery", price: 10, stock: 29, image: "https://cdn.mafrservices.com/sys-master-root/h3d/hd8/12408604262430/647967_main.jpg", note: "A little extra kick", color: "#f4d6bc" },
  { id: "dates", name: "82Fit Sultan Dates", category: "Grocery", price: 175, stock: 2, image: "/products/dates.png", note: "Sweet, soft & sun-kissed", color: "#dfd0bd" },
  { id: "chocolate", name: "70% Cocoa Dark", category: "Chocolate", price: 10, stock: 120, image: "/products/dark-chocolate.png", note: "A square for yourself", color: "#d8c9bd" },
  { id: "sewaiyan", name: "1 AM Swadist Sewaiyan", category: "Grocery", price: 20, stock: 8, image: "/products/sewaiyan.png", note: "A little bowl of comfort", color: "#eee0c9" },
  { id: "party-cup", name: "16 OZ Party Cup", category: "Home", price: 10, stock: 46, image: "/products/party-cups.png", note: "Ready for the good times", color: "#e7d9d2" },
  { id: "cracker", name: "2 PM Chicken Cracker", category: "Snacks", price: 20, stock: 2, image: "/products/chicken-cracker.png", note: "Crunch time, any time", color: "#ecd4ac" },
  { id: "papad", name: "24X7 ATM Papad Snacks", category: "Snacks", price: 5, stock: 7, image: "/products/papad.png", note: "The snack shelf MVP", color: "#f2d9ad" },
  { id: "tissues", name: "10 On Soft Facial Tissues", category: "Home", price: 90, stock: 4, image: "/products/tissues.png", note: "Soft on the little things", color: "#d9e4e2" },
  { id: "whiskas", name: "Whiskas Tuna in Jelly", category: "Pet care", price: 50, stock: 56, image: "/products/cat-food.png", note: "For the family with paws", color: "#e5d2cc" },
  { id: "classmate", name: "40 JTC Classmate", category: "Stationery", price: 30, stock: 6, image: "/products/classmate-notebook.png", note: "Fresh page, fresh start", color: "#d8dfd0" },
  { id: "face-wash", name: "Aha Face Wash", category: "Personal care", price: 299, stock: 2, image: "/products/face-wash.png", note: "A fresh start to the day", color: "#d2e4df" },
  { id: "air-wick", name: "Air Wick Freshmatic", category: "Home", price: 599, stock: 1, image: "/products/air-wick.png", note: "Make home feel like home", color: "#e3dfce" },
];
