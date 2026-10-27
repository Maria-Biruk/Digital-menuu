import {
  Lang,
  I18n,
  Station,
  MenuItem,
  Category,
  Table,
  PaymentAccount,
  Order,
  Ticket,
  Payment,
  CallWaiterAlert,
} from './types';

export const SLUG = 'meskel-house';

export interface MockCategory extends Category {}
export interface MockMenuItem extends MenuItem {}
export interface MockTable extends Table {}
export interface MockPaymentAccount extends PaymentAccount {}

export function tI18n(obj: I18n | Record<string, string> | undefined, lang: Lang = 'en'): string {
  if (!obj) return '';
  return obj[lang] || obj.en || Object.values(obj)[0] || '';
}

export const CATEGORIES: MockCategory[] = [
  {
    id: 'cat-coffee-drinks',
    slug: 'coffee-drinks',
    name_i18n: {
      en: 'Coffee & Drinks',
      am: 'ቡና እና መጠጦች',
      om: 'Buna fi Dhugaatii',
    },
    sort_order: 1,
  },
  {
    id: 'cat-milkshakes',
    slug: 'milkshakes',
    name_i18n: {
      en: 'Milkshakes',
      am: 'ሚልክሼኮች',
      om: 'Miilkisheekii',
    },
    sort_order: 2,
  },
  {
    id: 'cat-breakfast',
    slug: 'breakfast',
    name_i18n: {
      en: 'Breakfast',
      am: 'ቁርስ',
      om: 'Ciree',
    },
    sort_order: 3,
  },
  {
    id: 'cat-ethiopian',
    slug: 'ethiopian-food',
    name_i18n: {
      en: 'Ethiopian Food',
      am: 'የኢትዮጵያ ምግብ',
      om: 'Nyaata Itoophiyaa',
    },
    sort_order: 4,
  },
  {
    id: 'cat-lunch',
    slug: 'lunch',
    name_i18n: {
      en: 'Lunch & Dinner',
      am: 'ምሳ እና እራት',
      om: 'Laaqana',
    },
    sort_order: 5,
  },
  {
    id: 'cat-pizza-pasta',
    slug: 'pizza-pasta',
    name_i18n: {
      en: 'Pizza & Pasta',
      am: 'ፒዛ እና ፓስታ',
      om: 'Piizaa fi Paastaa',
    },
    sort_order: 6,
  },
  {
    id: 'cat-cocktails',
    slug: 'cocktails',
    name_i18n: {
      en: 'Cocktails',
      am: 'ኮክቴሎች',
      om: 'Kookteelii',
    },
    sort_order: 7,
  },
  {
    id: 'cat-desserts',
    slug: 'desserts',
    name_i18n: {
      en: 'Desserts',
      am: 'ጣፋጭ ምግቦች',
      om: "Mi'aawaa",
    },
    sort_order: 8,
  },
];

export const MENU: MockMenuItem[] = [
  // COFFEE & HOT DRINKS (Featured in Mockup)
  {
    id: 'm-hot-chocolate',
    category_id: 'cat-coffee-drinks',
    name_i18n: {
      en: 'Hot Chocolate',
      am: 'ትኩስ ቸኮሌት',
      om: 'Hot Chocolate',
    },
    description_i18n: {
      en: 'Rich velvety steamed milk infused with premium melted Belgian cocoa, topped with marshmallow cloud cream and dark chocolate curls.',
      am: 'በጥራት ከተመረጠ የቤልጂየም ቸኮሌት እና ከወተት የተዘጋጀ ጣፋጭ ትኩስ ቸኮሌት።',
      om: 'Hot chocolate mi’aawaa aannan fi chokoleetii qulqulluu irraa tolfame.',
    },
    price: 200,
    image_path: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegetarian'],
    station: 'bar',
    avg_prep_minutes: 6,
    is_available: true,
    calories: 340,
    rating: 4.9,
    reviews_count: 84,
    likes: 85,
    tag: 'Popular',
    ingredients: ['Belgian Dark Cocoa', 'Whole Steamed Milk', 'Vanilla Bean', 'Marshmallows', 'Chocolate Curls'],
  },
  {
    id: 'm-espresso-coffee',
    category_id: 'cat-coffee-drinks',
    name_i18n: {
      en: 'Espresso Coffee',
      am: 'ኤስፕሬሶ ቡና',
      om: 'Espresso Buna',
    },
    description_i18n: {
      en: 'Double shot of freshly roasted single-origin Ethiopian Sidama Arabica beans extracted under optimal pressure with golden tiger crema.',
      am: 'ከይርጋጨፌ እና ከሲዳማ የተመረጠ ጠንካራና ጥሩ መዓዛ ያለው ባለ ሁለት ሾት ኤስፕሬሶ።',
      om: 'Espresso cimaa buna biyya keessaa adda ta’e irraa tolfame.',
    },
    price: 120,
    image_path: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegan', 'gluten-free'],
    station: 'bar',
    avg_prep_minutes: 4,
    is_available: true,
    calories: 5,
    rating: 4.9,
    reviews_count: 142,
    likes: 95,
    tag: 'Best Seller',
    ingredients: ['100% Ethiopian Sidama Specialty Arabica Beans', 'Filtered Mountain Water'],
  },
  {
    id: 'm-mocha-coffee',
    category_id: 'cat-coffee-drinks',
    name_i18n: {
      en: 'Mocha Coffee',
      am: 'ሞካ ቡና',
      om: 'Mocha Buna',
    },
    description_i18n: {
      en: 'Signature espresso layered with bittersweet dark chocolate ganache, silky steamed milk, finished with dusting of Dutch cocoa.',
      am: 'ኤስፕሬሶ ከጣፋጭ ቸኮሌት እና ከወተት ክሬም ጋር ተቀላቅሎ የሚቀርብ ሞካ።',
      om: 'Mocha mi’aawaa buna espresso fi chokoleetii mi’aawaa waliin.',
    },
    price: 220,
    image_path: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegetarian'],
    station: 'bar',
    avg_prep_minutes: 6,
    is_available: true,
    calories: 310,
    rating: 4.9,
    reviews_count: 98,
    likes: 120,
    tag: 'Popular',
    ingredients: ['Espresso Roast', 'Artisan Chocolate Ganache', 'Steamed Milk', 'Dutch Cocoa Dust'],
  },
  {
    id: 'm-lata-coffee',
    category_id: 'cat-coffee-drinks',
    name_i18n: {
      en: 'Lata Coffee (Caffè Latte)',
      am: 'ላቴ ቡና',
      om: 'Laattee Buna',
    },
    description_i18n: {
      en: 'Smooth shot of freshly pulled espresso topped with delicately textured whole milk and hand-poured artisan rosette latte art.',
      am: 'የለሰለሰ ኤስፕሬሶ ከተመጠነ የሞቀ ወተት ክሬም ጋር በባለሙያ የተዘጋጀ ላቴ።',
      om: 'Laattee lallaafaa buna fi aannan ho’aa mi’aawaa irraa tolfame.',
    },
    price: 180,
    image_path: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegetarian'],
    station: 'bar',
    avg_prep_minutes: 5,
    is_available: true,
    calories: 190,
    rating: 4.8,
    reviews_count: 76,
    likes: 78,
    ingredients: ['Specialty Espresso', 'Fresh Whole Milk', 'Microfoam Texture'],
  },
  {
    id: 'm-ethiopian-buna',
    category_id: 'cat-coffee-drinks',
    name_i18n: {
      en: 'Ethiopian Buna (Ceremonial)',
      am: 'የኢትዮጵያ ባህላዊ ቡና',
      om: 'Buna Aadaa Itoophiyaa',
    },
    description_i18n: {
      en: 'Freshly clay-pot roasted Yirgacheffe single-origin Arabica coffee brewed in a traditional clay jebena, served with frankincense smoke & popcorn.',
      am: 'በትኩሱ የተቆላና በጀበና የፈላ የይርጋጨፌ ቡና ከእጣንና ፈንዲሻ ጋር።',
      om: 'Buna Yirgacheffe jabanaadhaan qophaa’e aara ixaana fi fandiishaa waliin.',
    },
    price: 90,
    image_path: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegan', 'gluten-free'],
    station: 'bar',
    avg_prep_minutes: 10,
    is_available: true,
    calories: 5,
    rating: 5.0,
    reviews_count: 220,
    likes: 150,
    tag: "Chef's Choice",
    ingredients: ['Yirgacheffe Single-Origin Green Beans', 'Spring Water', 'Frankincense', 'Fresh Popcorn'],
  },
  {
    id: 'm-passion-fruit-juice',
    category_id: 'cat-coffee-drinks',
    name_i18n: {
      en: 'Passion Fruit Juice',
      am: 'የፓሽን ፍሩት ጁስ',
      om: 'Juusii Paashinii',
    },
    description_i18n: {
      en: 'Cold-pressed tart and aromatic tropical passion fruit nectar sweetened with wild Ethiopian highland honey.',
      am: 'ተፈጥሯዊና ትኩስ የፓሽን ፍሩት ጁስ ከደጋ ማር ጋር።',
      om: 'Juusii firii paashinii qabbanaawaa damma uumamaatiin mi’eeffame.',
    },
    price: 130,
    image_path: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegan', 'gluten-free'],
    station: 'bar',
    avg_prep_minutes: 5,
    is_available: true,
    calories: 120,
    rating: 4.7,
    reviews_count: 62,
    likes: 64,
    ingredients: ['Fresh Passion Fruit Nectar', 'Ethiopian Highland Honey', 'Crushed Ice'],
  },

  // TOP MILK SHAKES (Featured in Mockup)
  {
    id: 'm-biscoff-milkshake',
    category_id: 'cat-milkshakes',
    name_i18n: {
      en: 'Biscoff Milkshakes',
      am: 'ቢስኮፍ ሚልክሼክ',
      om: 'Biscoff Miilkisheekii',
    },
    description_i18n: {
      en: 'Creamy Madagascar vanilla bean gelato blended with spiced Lotus Biscoff cookie butter, topped with whipped cream, crunchy biscuit crumbs, and warm speculoos drizzle.',
      am: 'ከቫኒላ አይስክሬም እና ከሎተስ ቢስኮፍ ኩኪስ ክሬም ጋር የተዘጋጀ ምርጥ ሚልክሼክ።',
      om: 'Miilkisheekii addaa Lotus Biscoff fi ayiskiriimii vaniilaa irraa tolfame.',
    },
    price: 200,
    image_path: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegetarian'],
    station: 'bar',
    avg_prep_minutes: 7,
    is_available: true,
    calories: 580,
    rating: 4.9,
    reviews_count: 95,
    likes: 30,
    tag: 'Popular',
    ingredients: ['Lotus Biscoff Spread', 'Vanilla Gelato', 'Whole Cream Milk', 'Speculoos Biscuits', 'Whipped Cream'],
  },
  {
    id: 'm-salted-caramel-milkshake',
    category_id: 'cat-milkshakes',
    name_i18n: {
      en: 'Salted Caramel Milkshakes',
      am: 'ሶልትድ ካራሜል ሚልክሼክ',
      om: 'Salted Caramel Miilkisheekii',
    },
    description_i18n: {
      en: 'Decadent hand-churned caramel shake swirled with artisanal fleur de sel salted caramel sauce, topped with toasted toffee crunch and gold sugar dust.',
      am: 'በጨዋማ ካራሜልና በአይስክሬም ተዘጋጅቶ በቶፊ ክራንች የተሸለመ የሚያምር ሚልክሼክ።',
      om: 'Miilkisheekii caramel mi’aawaa fi sogidda xiqqoo waliin lallaafaa.',
    },
    price: 200,
    image_path: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegetarian'],
    station: 'bar',
    avg_prep_minutes: 7,
    is_available: true,
    calories: 540,
    rating: 4.8,
    reviews_count: 82,
    likes: 50,
    tag: 'Popular',
    ingredients: ['Salted Butter Caramel', 'Fleur de Sel', 'Custard Ice Cream', 'Toffee Bits', 'Chantilly Cream'],
  },
  {
    id: 'm-decadent-chocolate-milkshake',
    category_id: 'cat-milkshakes',
    name_i18n: {
      en: 'Decadent Chocolate Milkshakes',
      am: 'ዴካደንት ቸኮሌት ሚልክሼክ',
      om: 'Decadent Chokoleetii Miilkisheekii',
    },
    description_i18n: {
      en: 'Double dark chocolate gelato churned with hot fudge chocolate ganache, brownie crumbles, chocolate syrup drizzle, and mini chocolate pearls.',
      am: 'በጣም ጣፋጭና በቸኮሌት ብራውኒ የተሞላ ደማቅ የቸኮሌት ሚልክሼክ።',
      om: 'Miilkisheekii chokoleetii hedduu mi’aawaa baay’ee jaalatamu.',
    },
    price: 200,
    image_path: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegetarian'],
    station: 'bar',
    avg_prep_minutes: 8,
    is_available: true,
    calories: 620,
    rating: 5.0,
    reviews_count: 156,
    likes: 100,
    tag: 'Best Seller',
    ingredients: ['Dark Chocolate Gelato', 'Fudge Ganache', 'Brownie Bites', 'Chocolate Shavings', 'Heavy Cream'],
  },
  {
    id: 'm-chocolate-milkshake',
    category_id: 'cat-milkshakes',
    name_i18n: {
      en: 'Chocolate Milkshakes',
      am: 'ቸኮሌት ሚልክሼክ',
      om: 'Chokoleetii Miilkisheekii',
    },
    description_i18n: {
      en: 'Classic ultra-thick creamy chocolate shake made with whole milk ice cream, Hershey style cocoa syrup, whipped cream, and chocolate wafer straw.',
      am: 'ባህላዊውና ተወዳጁ ወፍራም የቸኮሌት ሚልክሼክ ከዋፈር ጋር።',
      om: 'Miilkisheekii chokoleetii baramaa fi qabbanaawaa.',
    },
    price: 200,
    image_path: 'https://images.unsplash.com/photo-1568909344668-6f14a07b56a0?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegetarian'],
    station: 'bar',
    avg_prep_minutes: 6,
    is_available: true,
    calories: 490,
    rating: 4.7,
    reviews_count: 73,
    likes: 40,
    ingredients: ['Dutch Cocoa Ice Cream', 'Chocolate Syrup', 'Whole Milk', 'Crispy Wafer Straw'],
  },

  // ETHIOPIAN DISHES
  {
    id: 'm-doro-wat',
    category_id: 'cat-ethiopian',
    name_i18n: {
      en: 'Doro Wat Platter',
      am: 'ዶሮ ወጥ',
      om: 'Kukkuu Doro Wot',
    },
    description_i18n: {
      en: 'Traditional slow-cooked chicken drumsticks simmered in rich berbere sauce with hard-boiled eggs and fresh teff injera.',
      am: 'በበርበሬና በቅመማ ቅመም የበሰለ ባህላዊ የዶሮ ወጥ ከእንቁላልና ከእንጀራ ጋር።',
      om: 'Kukkuu doro mi’eessituu baramaatiin bilchaate kan hanqaaquu fi buddenaan dhiyaatu.',
    },
    price: 450,
    image_path: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['halal', 'spicy'],
    station: 'kitchen',
    avg_prep_minutes: 25,
    is_available: true,
    calories: 780,
    rating: 4.9,
    reviews_count: 180,
    likes: 185,
    tag: 'Popular',
    ingredients: ['Tender Chicken Drumsticks', 'Organic Berbere Spice', 'Niter Kibbeh (Clarified Spiced Butter)', 'Hard-Boiled Egg', 'Teff Injera', 'Ayib Cheese'],
  },
  {
    id: 'm-beyaynetu',
    category_id: 'cat-ethiopian',
    name_i18n: {
      en: 'Beyaynetu Vegan Platter',
      am: 'በያይነቱ',
      om: 'Beyaynetuu',
    },
    description_i18n: {
      en: 'A colorful platter of traditional fasting stews: shiro, misir wot, gomen, atkilt, and spicy beetroot salad on injera.',
      am: 'የተለያዩ የፆም ወጦች ቅልቅል፡ ሽሮ፣ ምስር፣ ጎመን እና አትክልት ከትኩስ እንጀራ ጋር።',
      om: 'Qophii soomaa mi’aawaa: shiroo, misira, gomenii fi fuduraalee waliin.',
    },
    price: 320,
    image_path: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegan', 'vegetarian', 'fasting'],
    station: 'kitchen',
    avg_prep_minutes: 15,
    is_available: true,
    calories: 620,
    rating: 4.8,
    reviews_count: 135,
    likes: 140,
    tag: 'New',
    ingredients: ['Misir Wot (Red Lentils)', 'Kik Alicha (Yellow Split Peas)', 'Gomen (Collard Greens)', 'Atkilt (Cabbage & Carrots)', 'Shiro Wot', 'Teff Injera'],
  },
  {
    id: 'm-beef-tibs',
    category_id: 'cat-ethiopian',
    name_i18n: {
      en: 'Special Beef Tibs',
      am: 'የበሬ ጥብስ',
      om: 'Tibsii Foon Loowanii',
    },
    description_i18n: {
      en: 'Pan-seared tender beef cubes tossed with rosemary, sweet red onions, garlic, and fresh green jalapeños on a sizzling clay skillet.',
      am: 'የለሰለሰ የበሬ ሥጋ በሽንኩርት፣ ቃሪያ እና ሮዝመሪ የተጠበሰ።',
      om: 'Foon loowanii laafaa shunkurtii, qullubbii fi qaaraa waliin waxalame.',
    },
    price: 380,
    image_path: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['halal', 'gluten-free', 'spicy'],
    station: 'kitchen',
    avg_prep_minutes: 18,
    is_available: true,
    calories: 720,
    rating: 4.9,
    reviews_count: 165,
    likes: 168,
    tag: "Chef's Choice",
    ingredients: ['Prime Tender Beef Cubes', 'Rosemary Sprigs', 'Red Onions', 'Garlic', 'Green Jalapeños', 'Niter Kibbeh', 'Fresh Injera'],
  },
  {
    id: 'm-chechebsa',
    category_id: 'cat-breakfast',
    name_i18n: {
      en: 'Traditional Chechebsa',
      am: 'ጨጨብሳ (ቂጣ ፍርፍር)',
      om: 'Caccabsaa',
    },
    description_i18n: {
      en: 'Torn pieces of pan-baked flatbread glazed with spiced clarified butter (kibe) and berbere sauce, served with honey yoghurt.',
      am: 'የተቆራረሰ ቂጣ በንጥር ቅቤ እና በርበሬ የተለወሰ ከእርጎ ጋር የሚቀርብ።',
      om: 'Daabboo xiqqaatee qophaa’e kan dhadhaa mi’aawaa fi damma waliin makame.',
    },
    price: 240,
    image_path: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegetarian'],
    station: 'kitchen',
    avg_prep_minutes: 12,
    is_available: true,
    calories: 540,
    rating: 4.8,
    reviews_count: 90,
    likes: 88,
    ingredients: ['Handmade Kita Flatbread', 'Niter Kibbeh (Clarified Butter)', 'Berbere Spice Blend', 'Natural Yoghurt', 'Wild Honey'],
  },
  {
    id: 'm-kitfo-special',
    category_id: 'cat-lunch',
    name_i18n: {
      en: 'Kitfo Special',
      am: 'ክትፎ ስፔሻል',
      om: 'Kitfoo Addaa',
    },
    description_i18n: {
      en: 'Prime minced lean beef warmed in herb-infused nitir qibe and mitmita, served with ayib cheese, kocho, and gomen kitfo.',
      am: 'የተመረጠ ቀይ የበሬ ሥጋ በሚጥሚጣና በንጥር ቅቤ ተለውሶ ከአይብና ከጎመን ጋር።',
      om: 'Foon daakame dhangaggaawaa dhadhaa qulqulluu fi aayibii aadaatiin qophaa’e.',
    },
    price: 490,
    image_path: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['halal', 'gluten-free', 'spicy'],
    station: 'kitchen',
    avg_prep_minutes: 15,
    is_available: true,
    calories: 810,
    rating: 4.9,
    reviews_count: 195,
    likes: 195,
    tag: 'Best Seller',
    ingredients: ['Prime Minced Lean Beef', 'Mitmita Hot Chili', 'Spiced Butter (Qibe)', 'Ayib Cottage Cheese', 'Steamed Gomen', 'Kocho'],
  },
  {
    id: 'm-margherita-pizza',
    category_id: 'cat-pizza-pasta',
    name_i18n: {
      en: 'Margherita Pizza',
      am: 'ማርገሪታ ፒዛ',
      om: 'Margherita Piizaa',
    },
    description_i18n: {
      en: 'Artisan hand-stretched sourdough crust with San Marzano tomato pomodoro, creamy fior di latte mozzarella, and fresh sweet basil.',
      am: 'በእጅ የተቦካ ትኩስ ፒዛ ከሞዛሬላ አይብ፣ ቲማቲም እና ባዝል ቅጠል ጋር።',
      om: 'Piizaa aadaa xaaliyaanii timaatima, mozzaarellaa fi baazilii qulqulluu waliin.',
    },
    price: 360,
    image_path: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegetarian'],
    station: 'kitchen',
    avg_prep_minutes: 20,
    is_available: true,
    calories: 690,
    rating: 4.7,
    reviews_count: 85,
    likes: 75,
    ingredients: ['Fermented Sourdough Dough', 'San Marzano Tomato Sauce', 'Fresh Fior di Latte Mozzarella', 'Sweet Basil Leaves', 'Extra Virgin Olive Oil'],
  },
  {
    id: 'm-truffle-pasta',
    category_id: 'cat-pizza-pasta',
    name_i18n: {
      en: 'Truffle Mushroom Pasta',
      am: 'ትራፍል ፓስታ',
      om: 'Truffle Paastaa',
    },
    description_i18n: {
      en: 'Fresh tagliatelle tossed in decadent black truffle cream reduction, roasted wild mushrooms, and aged Parmigiano Reggiano.',
      am: 'በክሬም እና ትራፍል ሶስ የተዘጋጀ ትኩስ ፓስታ ከእንጉዳይና ፓርሜዛን አይብ ጋር።',
      om: 'Paastaa mi’aawaa kirimii truffle, boombii fi paarmeezaanii waliin.',
    },
    price: 420,
    image_path: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281223?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegetarian'],
    station: 'kitchen',
    avg_prep_minutes: 18,
    is_available: true,
    calories: 740,
    rating: 4.8,
    reviews_count: 102,
    likes: 90,
    tag: 'Popular',
    ingredients: ['Fresh Tagliatelle Pasta', 'Black Truffle Oil', 'Wild Forest Mushrooms', 'Double Cream', 'Aged Parmigiano Reggiano', 'Flat Leaf Parsley'],
  },
  {
    id: 'm-baklava',
    category_id: 'cat-desserts',
    name_i18n: {
      en: 'Baklava Pistachio',
      am: 'ባክላቫ',
      om: 'Baqlaawaa',
    },
    description_i18n: {
      en: 'Crisp layers of delicate golden phyllo pastry filled with chopped roasted pistachios and walnuts, steeped in floral orange-blossom honey syrup.',
      am: 'በማርና በለውዝ የተሞላ ቀጭንና ጣፋጭ የባክላቫ ኬክ።',
      om: 'Mi’aawaa baqlaawaa damma fi loozii mi’aawaa qabate.',
    },
    price: 180,
    image_path: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['vegetarian'],
    station: 'kitchen',
    avg_prep_minutes: 8,
    is_available: true,
    calories: 320,
    rating: 4.8,
    reviews_count: 70,
    likes: 60,
    ingredients: ['Butter Glazed Phyllo Pastry', 'Roasted Antep Pistachios', 'Crushed Walnuts', 'Orange Blossom Water', 'Pure Highland Honey'],
  },
  {
    id: 'm-house-tej',
    category_id: 'cat-cocktails',
    name_i18n: {
      en: 'House Tej (Honey Wine)',
      am: 'የቤት ጠጅ (የማር ወይን)',
      om: 'Daadhii Dammaa (Tej)',
    },
    description_i18n: {
      en: 'Authentic fermented Ethiopian mead made from wild flora honey and gesho hops, served in a traditional glass berele.',
      am: 'ከተመረጠ ማርና ጌሾ የተዘጋጀ ጥንታዊ ባህላዊ የብርሌ ጠጅ።',
      om: 'Daadhii dammaa aadaa bareeda birilleedhaan dhiyaatu.',
    },
    price: 190,
    image_path: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['gluten-free'],
    station: 'bar',
    avg_prep_minutes: 5,
    is_available: true,
    calories: 150,
    rating: 4.8,
    reviews_count: 110,
    likes: 110,
    ingredients: ['Raw Wildflower Honey', 'Fermented Gesho Leaves', 'Purified Water'],
  },
  {
    id: 'm-hibiscus-gin',
    category_id: 'cat-cocktails',
    name_i18n: {
      en: 'Hibiscus Gin Cocktail',
      am: 'ሃይቢስከስ ጂን ኮክቴል',
      om: 'Hibiscus Gin Kookteelii',
    },
    description_i18n: {
      en: 'Botanical artisan gin shaken with steeped ruby hibiscus karkadeh cordial, fresh lime juice, and sparkling soda with edible petals.',
      am: 'የሃይቢስከስ አበባ፣ የሎሚ ጁስ እና ጂን ቅልቅል የሚያምር ኮክቴል።',
      om: 'Kookteelii gin fi daraaraa hibiscus qabbanaawaa mi’eessituu addaatiin.',
    },
    price: 280,
    image_path: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80',
    dietary_tags: ['gluten-free'],
    station: 'bar',
    avg_prep_minutes: 7,
    is_available: true,
    calories: 190,
    rating: 4.9,
    reviews_count: 85,
    likes: 85,
    ingredients: ['Dry Botanical Gin', 'Steeped Hibiscus Karkadeh', 'Fresh Lime Juice', 'Simple Syrup', 'Sparkling Club Soda'],
  },
];

export const TABLES: MockTable[] = Array.from({ length: 12 }, (_, i) => ({
  id: `t${i + 1}`,
  label: `${i + 1}`,
  is_active: true,
}));

export const PAYMENT_ACCOUNTS: MockPaymentAccount[] = [
  {
    id: 'pa-cbe',
    account_type: 'bank',
    label: 'Commercial Bank of Ethiopia (CBE)',
    account_name: 'Skill Coffee Hospitality PLC',
    account_number: '1000123456789',
    is_active: true,
  },
  {
    id: 'pa-awash',
    account_type: 'bank',
    label: 'Awash International Bank',
    account_name: 'Skill Coffee Hospitality PLC',
    account_number: '0132087654321',
    is_active: true,
  },
  {
    id: 'pa-telebirr',
    account_type: 'telebirr',
    label: 'Telebirr SuperApp Pay',
    account_name: 'Skill Coffee Dining',
    phone_number: '+251 91 123 4567',
    is_active: true,
  },
];

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'tkt-101',
    order_id: 'ord-8421',
    station: 'kitchen',
    table_label: 'Table 4',
    items: [
      { name: 'Doro Wat', quantity: 2, notes: 'Extra berbere spice on side' },
      { name: 'Chechebsa', quantity: 1, notes: 'With extra honey' },
    ],
    status: 'queued',
    notes: 'Guests requested prompt service for kids.',
    pickup_code: '4192',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    elapsed_minutes: 12,
  },
  {
    id: 'tkt-102',
    order_id: 'ord-8422',
    station: 'kitchen',
    table_label: 'Table 7',
    items: [
      { name: 'Beef Tibs', quantity: 1, notes: 'Medium well done' },
      { name: 'Beyaynetu', quantity: 1 },
    ],
    status: 'preparing',
    notes: 'Allergy note: no bell peppers in salad.',
    pickup_code: '7823',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    elapsed_minutes: 18,
  },
  {
    id: 'tkt-103',
    order_id: 'ord-8423',
    station: 'kitchen',
    table_label: 'Table 2',
    items: [
      { name: 'Margherita Pizza', quantity: 1, notes: 'Extra crispy crust' },
      { name: 'Baklava', quantity: 2 },
    ],
    status: 'ready',
    pickup_code: '2351',
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    elapsed_minutes: 25,
  },
  {
    id: 'tkt-201',
    order_id: 'ord-8421',
    station: 'bar',
    table_label: 'Table 4',
    items: [
      { name: 'Ethiopian Buna (Ceremonial)', quantity: 2, notes: 'Dark roast, no sugar' },
      { name: 'Passion Fruit Juice', quantity: 1 },
    ],
    status: 'preparing',
    pickup_code: '4192',
    created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    elapsed_minutes: 8,
  },
  {
    id: 'tkt-202',
    order_id: 'ord-8424',
    station: 'bar',
    table_label: 'Table 9',
    items: [
      { name: 'House Tej (Honey Wine)', quantity: 3 },
      { name: 'Hibiscus Gin Cocktail', quantity: 2, notes: 'Less ice' },
    ],
    status: 'ready',
    pickup_code: '9184',
    created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    elapsed_minutes: 14,
  },
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-701',
    order_id: 'ord-8421',
    amount: 1280,
    account_id: 'pa-cbe',
    account_label: 'Commercial Bank of Ethiopia',
    method: 'transfer',
    proof_image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    transaction_id: 'CBE-TX-998124',
    status: 'pending_verification',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'pay-702',
    order_id: 'ord-8424',
    amount: 1130,
    account_id: 'pa-telebirr',
    account_label: 'Telebirr SuperApp Pay',
    method: 'transfer',
    proof_image: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=600&auto=format&fit=crop&q=80',
    transaction_id: 'TLB-883019',
    status: 'pending_verification',
    created_at: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
  },
];

export const INITIAL_CALL_ALERTS: CallWaiterAlert[] = [
  {
    id: 'call-1',
    table_id: 't3',
    table_label: 'Table 3',
    created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    status: 'pending',
  },
  {
    id: 'call-2',
    table_id: 't8',
    table_label: 'Table 8',
    created_at: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    status: 'pending',
  },
];

export const getTicketsFromStorage = (): Ticket[] => {
  if (typeof window === 'undefined') return INITIAL_TICKETS;
  const stored = localStorage.getItem('meskel_tickets');
  if (!stored) {
    localStorage.setItem('meskel_tickets', JSON.stringify(INITIAL_TICKETS));
    return INITIAL_TICKETS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_TICKETS;
  }
};

export const saveTicketsToStorage = (tickets: Ticket[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('meskel_tickets', JSON.stringify(tickets));
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('tickets_updated'));
};

export const addTicketToStorage = (ticket: Ticket) => {
  const current = getTicketsFromStorage();
  const updated = [ticket, ...current];
  saveTicketsToStorage(updated);
  return updated;
};

