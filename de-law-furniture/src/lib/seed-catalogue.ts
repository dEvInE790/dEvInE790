import { images } from "./images";
import type { SeedCategory } from "./types";

/**
 * SEED DATA for the furniture catalogue. On first run it is copied into the
 * database; after that, collections and products are managed at /admin.
 * Product names describe common design styles that are made to order —
 * there are NO fixed prices.
 */

export const seedCategories: SeedCategory[] = [
  {
    slug: "sofas",
    name: "Sofas",
    singular: "Sofa",
    index: "01",
    tagline: "Comfort, tailored to the room.",
    intro:
      "Hand-built frames, carefully selected fabrics and considered proportions. Every sofa is made to suit your space, the way you live and the look you want.",
    cover: images.sofaVelvet,
    customisation: ["Size & seating capacity", "Fabric type and colour", "Arm, back & leg style", "Cushion firmness", "Wood finish for exposed frames"],
    products: [
      {
        slug: "sectional-sofa",
        name: "L-Shaped Sectional Sofa",
        summary: "Generous corner seating for family living rooms.",
        description:
          "A spacious sectional designed around your room's dimensions — ideal for family living rooms and lounges. Built on a sturdy wooden frame and upholstered in the fabric of your choice.",
        features: ["Left or right-hand configuration", "Made to your room's measurements", "Choice of upholstery fabric", "Optional chaise or ottoman"],
        images: [images.livingBright, images.livingLounge],
      },
      {
        slug: "three-seater-sofa",
        name: "Three-Seater Sofa",
        summary: "A timeless centrepiece in your choice of fabric.",
        description:
          "The everyday centrepiece of a well-furnished home. Clean lines, deep seating and finishing details chosen by you — from arm profile to leg style.",
        features: ["Two- and three-seater sizes", "Button, piped or plain finishing", "Exposed or concealed wooden legs", "Matching armchairs available"],
        images: [images.sofaVelvet, images.sofaClassic],
      },
      {
        slug: "sofa-set",
        name: "Complete Sofa Set",
        summary: "Coordinated sofas and armchairs for full living spaces.",
        description:
          "A coordinated set of sofas and armchairs designed together, so your living room feels considered and complete. Configured to your room and seating needs.",
        features: ["Mix of sofas and armchairs", "Coordinated fabrics & finishes", "Planned around your floor space", "Delivered and arranged in place"],
        images: [images.livingWarm, images.livingNeutral],
      },
    ],
  },
  {
    slug: "kitchen-cabinets",
    name: "Kitchen Cabinets",
    singular: "Kitchen Cabinet",
    index: "02",
    tagline: "The heart of the home, built to last.",
    intro:
      "Fitted kitchen cabinetry built from quality wood and plywood, designed around your layout, your appliances and how you cook.",
    cover: images.kitchenWhite,
    customisation: ["Layout planned to your measurements", "Cabinet door style and finish", "Colour and handle options", "Storage fittings and shelving", "Wall, base and tall units"],
    products: [
      {
        slug: "fitted-kitchen",
        name: "Fitted Kitchen Cabinets",
        summary: "Complete wall and base units planned to your kitchen.",
        description:
          "A full set of wall and base units measured and built for your kitchen. We plan the layout around your appliances, plumbing and storage needs, then manufacture and install on site.",
        features: ["Site measurement & layout planning", "Wall, base and tall units", "Durable wood and plywood carcasses", "Professional installation"],
        images: [images.kitchenWhite, images.kitchenModern],
      },
      {
        slug: "kitchen-island",
        name: "Kitchen Island Unit",
        summary: "Extra preparation space and storage at the centre.",
        description:
          "A freestanding or fitted island that adds work surface, storage and a natural gathering point. Sized and finished to match your existing cabinetry or a brand-new kitchen.",
        features: ["Sized to your floor space", "Drawers, shelves or cupboards", "Optional seating overhang", "Finished to match your kitchen"],
        images: [images.kitchenWarm, images.kitchenWhite],
      },
      {
        slug: "pantry-storage",
        name: "Pantry & Tall Storage",
        summary: "Floor-to-ceiling storage that keeps kitchens orderly.",
        description:
          "Tall pantry units and storage columns that make the most of every centimetre — designed to hold provisions, appliances and cookware neatly out of sight.",
        features: ["Floor-to-ceiling designs", "Adjustable internal shelving", "Appliance housing options", "Matched door finishes"],
        images: [images.kitchenModern, images.kitchenWarm],
      },
    ],
  },
  {
    slug: "bed-frames",
    name: "Bed Frames",
    singular: "Bed Frame",
    index: "03",
    tagline: "Rest, beautifully supported.",
    intro:
      "Solid, quiet and beautifully finished bed frames — from upholstered headboards to classic wooden designs, built in the size you need.",
    cover: images.bedroomCalm,
    customisation: ["Bed size", "Headboard height and style", "Upholstered or wooden finish", "Under-bed storage", "Matching bedside tables"],
    products: [
      {
        slug: "upholstered-bed",
        name: "Upholstered Bed Frame",
        summary: "A padded headboard in the fabric of your choice.",
        description:
          "A statement upholstered bed with a padded headboard, built on a strong wooden base. Choose the fabric, colour, headboard height and stitching detail.",
        features: ["All standard bed sizes", "Tall or low headboard", "Choice of fabric & colour", "Solid slatted base"],
        images: [images.bedroomHotel, images.bedroomCalm],
      },
      {
        slug: "wooden-bed",
        name: "Wooden Bed Frame",
        summary: "Classic timber craftsmanship with a refined finish.",
        description:
          "A wooden bed frame that celebrates the material — clean joinery, smooth finishing and a stain or colour chosen to suit your bedroom.",
        features: ["Selected quality wood", "Stain and finish options", "Optional matching bedside tables", "Built for long-term durability"],
        images: [images.bedroomLinen, images.bedroomLight],
      },
      {
        slug: "storage-bed",
        name: "Storage Bed Frame",
        summary: "Hidden storage beneath a clean, modern design.",
        description:
          "A space-saving bed with built-in drawers or a lift-up base — ideal for apartments and guest rooms where storage matters.",
        features: ["Drawer or lift-up storage", "Upholstered or wooden finish", "Made to your room size", "Smooth, durable fittings"],
        images: [images.bedroomSoft, images.bedroomHotel],
      },
    ],
  },
  {
    slug: "window-blinds",
    name: "Window Blinds",
    singular: "Window Blind",
    index: "04",
    tagline: "Light, precisely controlled.",
    intro:
      "Window blinds measured and fitted to your windows — controlling light and privacy while finishing the room cleanly.",
    cover: images.interiorLamp,
    customisation: ["Measured to each window", "Blind style", "Fabric, colour & opacity", "Inside or outside recess fitting", "Professional installation"],
    products: [
      {
        slug: "roller-blinds",
        name: "Roller Blinds",
        summary: "Clean, minimal light control for any room.",
        description:
          "Simple and tidy roller blinds that suit homes and offices alike. Measured precisely to each window and fitted by our team.",
        features: ["Made to measure", "Light-filtering or blackout options", "Neutral and bold colours", "Installed on site"],
        images: [images.interiorLamp, images.bedroomLight],
      },
      {
        slug: "roman-blinds",
        name: "Roman Blinds",
        summary: "Soft fabric folds for a tailored, elegant look.",
        description:
          "Fabric blinds that fold neatly as they rise — combining the softness of curtains with the tidiness of a blind.",
        features: ["Choice of fabric", "Lined for privacy", "Elegant folded finish", "Made to each window"],
        images: [images.bedroomSoft, images.interiorCalm],
      },
      {
        slug: "office-blinds",
        name: "Office & Vertical Blinds",
        summary: "Practical glare control for workspaces.",
        description:
          "Practical, easy-to-operate blinds for offices and large windows — reducing glare on screens while keeping workspaces bright.",
        features: ["Suited to wide windows", "Glare and privacy control", "Durable everyday operation", "Fitted around your schedule"],
        images: [images.officeMeeting, images.office],
      },
    ],
  },
  {
    slug: "curtains",
    name: "Curtains",
    singular: "Curtain",
    index: "05",
    tagline: "Soft drapery, perfectly hung.",
    intro:
      "Curtains made from carefully chosen fabrics, cut and finished to the right length and fullness for each window, then installed in place.",
    cover: images.bedroomSoft,
    customisation: ["Fabric, colour and pattern", "Length and fullness", "Header style", "Lining and blackout", "Rails, rods and installation"],
    products: [
      {
        slug: "blackout-curtains",
        name: "Lined Blackout Curtains",
        summary: "Restful darkness and privacy for bedrooms.",
        description:
          "Fully lined curtains that block light for deeper rest and greater privacy — ideal for bedrooms and media rooms.",
        features: ["Blackout lining", "Choice of face fabric", "Floor-length finishing", "Rails or rods installed"],
        images: [images.bedroomHotel, images.bedroomSoft],
      },
      {
        slug: "sheer-curtains",
        name: "Sheer & Layered Curtains",
        summary: "Soft daylight with an airy, elegant feel.",
        description:
          "Light, sheer curtains that filter daylight beautifully — on their own or layered with heavier drapes for flexibility through the day.",
        features: ["Sheer or layered options", "Soft natural light", "Neutral fabric palette", "Double-rail installation"],
        images: [images.bedroomLight, images.interiorLamp],
      },
      {
        slug: "living-room-drapes",
        name: "Living Room Drapes",
        summary: "Statement drapery that frames the room.",
        description:
          "Full, floor-length drapes that frame windows and complete a living room — tailored in fabrics chosen to complement your furniture.",
        features: ["Generous fullness", "Pleated header styles", "Coordinated with upholstery", "Measured & installed"],
        images: [images.livingWarm, images.interiorCalm],
      },
    ],
  },
  {
    slug: "wardrobes",
    name: "Wardrobes",
    singular: "Wardrobe",
    index: "06",
    tagline: "Storage, made seamless.",
    intro:
      "Built-in and freestanding wardrobes designed around your wall space and what you need to store — finished to blend beautifully with the bedroom.",
    cover: images.bedroomLight,
    customisation: ["Fitted or freestanding", "Hinged or sliding doors", "Internal layout: hanging, shelves, drawers", "Door finish & handles", "Mirror panels"],
    products: [
      {
        slug: "fitted-wardrobe",
        name: "Built-In Fitted Wardrobe",
        summary: "Floor-to-ceiling storage built into your wall.",
        description:
          "A wall-to-wall, floor-to-ceiling wardrobe that makes the most of every space. Measured on site and built in quality wood and plywood.",
        features: ["Built to wall dimensions", "Custom interior layout", "Hinged or sliding doors", "Installed on site"],
        images: [images.bedroomLight, images.bedroomCalm],
      },
      {
        slug: "sliding-door-wardrobe",
        name: "Sliding-Door Wardrobe",
        summary: "Space-saving doors with a sleek finish.",
        description:
          "Sliding doors that save floor space in compact bedrooms, with optional mirror panels and an interior arranged exactly how you need it.",
        features: ["Smooth sliding mechanism", "Mirror panel options", "Hanging, shelving & drawers", "Clean modern finish"],
        images: [images.bedroomHotel, images.bedroomSoft],
      },
      {
        slug: "walk-in-wardrobe",
        name: "Walk-In Wardrobe Fit-Out",
        summary: "A dressing room organised to your wardrobe.",
        description:
          "A complete dressing-room fit-out with open hanging, shelving and drawers — designed around your clothing, shoes and accessories.",
        features: ["Room-scale planning", "Open and closed storage", "Drawers and shoe shelving", "Coordinated finishes"],
        images: [images.interiorCalm, images.bedroomLinen],
      },
    ],
  },
  {
    slug: "dining-sets",
    name: "Dining Sets",
    singular: "Dining Set",
    index: "07",
    tagline: "Where every meal gathers people.",
    intro:
      "Dining tables and chairs built for daily family meals and long celebrations alike — sized for your space and seating needs.",
    cover: images.dining,
    customisation: ["Number of seats", "Table shape and size", "Wood type and finish", "Chair upholstery fabric", "Matching sideboards"],
    products: [
      {
        slug: "six-seater-dining",
        name: "Six-Seater Dining Set",
        summary: "A balanced table and chair set for family homes.",
        description:
          "A dining table with six chairs — finished in your choice of wood tone and upholstery, and proportioned for comfortable everyday use.",
        features: ["Table with six chairs", "Upholstered or wooden seats", "Choice of wood finish", "Sturdy, stable construction"],
        images: [images.dining, images.diningOpen],
      },
      {
        slug: "eight-seater-dining",
        name: "Eight-Seater Dining Set",
        summary: "Generous seating for larger households and guests.",
        description:
          "A larger dining set for big families and frequent entertaining, with a table sized to your dining room and chairs to match.",
        features: ["Table with eight chairs", "Rectangular or oval tables", "Coordinated upholstery", "Delivered & assembled"],
        images: [images.diningOpen, images.diningKitchen],
      },
      {
        slug: "compact-dining",
        name: "Compact Dining Set",
        summary: "Space-conscious dining for apartments.",
        description:
          "A compact four-seater set designed for apartments and smaller dining areas without compromising on finish or comfort.",
        features: ["Four-seater layout", "Round or square tables", "Space-saving proportions", "Durable finishes"],
        images: [images.diningKitchen, images.livingApartment],
      },
    ],
  },
  {
    slug: "tv-consoles",
    name: "TV Consoles",
    singular: "TV Console",
    index: "08",
    tagline: "Entertainment, elegantly organised.",
    intro:
      "TV consoles and media walls that keep cables, devices and décor beautifully organised — designed around your screen and wall.",
    cover: images.livingModern,
    customisation: ["Width to suit your wall and screen", "Floating or floor-standing", "Open shelves & closed storage", "Cable management", "Wood finish and colour"],
    products: [
      {
        slug: "tv-console-unit",
        name: "Low TV Console Unit",
        summary: "A clean, low profile with concealed storage.",
        description:
          "A low TV console with drawers and cabinets to keep devices and accessories out of sight, finished to complement your living room.",
        features: ["Sized to your screen", "Drawers and cabinets", "Cable management openings", "Choice of finish"],
        images: [images.livingModern, images.livingNeutral],
      },
      {
        slug: "tv-wall-unit",
        name: "TV Wall Unit",
        summary: "A full media wall with display shelving.",
        description:
          "A complete media wall with a central TV panel, display shelves and storage — turning the TV area into a designed feature of the room.",
        features: ["Wall-to-wall designs", "Display & closed storage", "Concealed wiring", "Installed on site"],
        images: [images.interiorOpen, images.livingModern],
      },
      {
        slug: "floating-tv-console",
        name: "Floating TV Console",
        summary: "Wall-mounted for a light, modern look.",
        description:
          "A wall-mounted console that keeps the floor clear for a light, contemporary feel — securely fixed by our installation team.",
        features: ["Wall-mounted design", "Secure installation", "Push-to-open options", "Minimal, modern lines"],
        images: [images.livingApartment, images.interiorCalm],
      },
    ],
  },
  {
    slug: "office-furniture",
    name: "Office Furniture",
    singular: "Office Furniture",
    index: "09",
    tagline: "Workspaces that work as hard as you.",
    intro:
      "Office tables, workstations and complete office furniture settings — practical, durable and designed to present your business professionally.",
    cover: images.office,
    customisation: ["Desk size and shape", "Workstation configuration", "Storage pedestals & cabinets", "Finish and colour", "Full office layout planning"],
    products: [
      {
        slug: "executive-desk",
        name: "Executive Office Table",
        summary: "A commanding desk for directors and managers.",
        description:
          "An executive table with integrated storage and a refined finish — built to make a confident impression in private offices.",
        features: ["Generous work surface", "Integrated drawers", "Optional side return", "Premium finishing"],
        images: [images.officeDesk, images.office],
      },
      {
        slug: "office-workstations",
        name: "Office Workstations",
        summary: "Configurable desks for productive teams.",
        description:
          "Workstation clusters configured to your floor plan and team size — with cable management and storage built in.",
        features: ["Clusters for any team size", "Cable management", "Storage pedestals", "Planned to your floor"],
        images: [images.office, images.officeMeeting],
      },
      {
        slug: "conference-table",
        name: "Conference & Meeting Table",
        summary: "Boardroom tables sized for your meetings.",
        description:
          "Meeting and boardroom tables built to seat your team comfortably, with finishes that present your organisation professionally.",
        features: ["Sized to your boardroom", "Optional cable ports", "Matching credenzas", "Delivered & installed"],
        images: [images.officeMeeting, images.officeDesk],
      },
    ],
  },
];
