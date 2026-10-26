/* ---------- Bike catalogue (specs from nairobipowerbikes.com) ----------
   style: city | sport | adventure   beginner: true if friendly for new riders
   price: indicative KES, editable in the admin panel                      */
var BIKES = [
  {
    id: "tekken-250-evo", brand: "Tekken", name: "250 Evo", style: "adventure", beginner: true, featured: true,
    price: 380000, photo: true, page: "tekken-250-evo.html",
    tagline: "Light enough for the city, tough enough for murram.",
    cc: 249, power: "18 kW", weight: 145, top: 155, seat: 820, tank: 14, clearance: 260,
    goodFor: ["Daily commute", "Weekend murram", "First big bike", "Tall riders"],
    imgs: ["65df6f93fdbde68eb8812c07.jpeg", "65df6f93fdbde65ed2812c08.jpeg", "65df6f93b6f0838294fbaec1.jpeg", "65df6f93fc239a93f6a8a716.jpeg", "65df6f936f2de861334dd957.jpeg", "65df6f933806e857015bbb5d.jpeg"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "1,820 × 490 × 880 mm", "Wheelbase": "1,370 mm", "Seat height": "820 mm", "Ground clearance": "260 mm", "Net weight": "145 kg", "Top speed": "155 km/h", "Fuel tank": "14 L", "Tyres": "4.6-17 front, 5.1-17 rear" },
      Chassis: { "Front suspension": "Inverted forks", "Rear suspension": "Monoshock", "Brakes": "Hydraulic discs front and rear", "ABS": "Equipped", "Wheels": "Steel spoke", "Lighting": "Full LED, plate light", "Display": "TFT meter" },
      Engine: { "Type": "Single cylinder, 4-valve, 4-stroke, oil cooled, engine guard", "Displacement": "249 cc", "Compression": "8.6 : 1", "Max power": "18 kW @ 8,500 rpm", "Max torque": "22 Nm @ 8,500 rpm", "Bore × stroke": "78 × 52.3 mm", "Fuel system": "Carburettor (PZ-30)", "Gearbox": "6-speed" }
    }
  },
  {
    id: "tekken-250x-adv", brand: "Tekken", name: "250X ADV", style: "adventure", beginner: true, price: 420000, photo: true,
    tagline: "Alloy wheels, KYB and Öhlins suspension, dual ABS discs.",
    cc: 249, power: "18 kW", weight: 140, top: 155, seat: 820, tank: 14, clearance: 260,
    goodFor: ["Tarmac touring", "Commute", "Tall riders"],
    imgs: ["65da2e3f810c876512370b03.jpeg", "65da2e3fde43c993cb1cbd12.jpeg", "65da2e3f810c87cb9e370b04.jpeg", "65da2e3f1183993b7902573b.jpeg", "65da2e3f51004b0e698255ef.jpeg", "65da2e3fcab0501a98432737.jpeg"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "2,100 × 860 × 1,180 mm", "Wheelbase": "1,370 mm", "Seat height": "820 mm", "Ground clearance": "260 mm", "Net weight": "140 kg", "Top speed": "155 km/h", "Fuel tank": "14 L", "Tyres": "110/70-17 front, 150/70-17 rear" },
      Chassis: { "Front suspension": "Inverted, KYB", "Rear suspension": "Öhlins monoshock, aluminium swingarm", "Brakes": "Dual front, single rear (ABS)", "ABS": "Equipped", "Wheels": "Alloy sport", "Lighting": "Dual LED", "Display": "TFT meter" },
      Engine: { "Type": "Single cylinder, 4-stroke, 4-valve, oil cooled, engine guard", "Displacement": "249 cc", "Compression": "8.6 : 1", "Max power": "18 kW @ 8,500 rpm", "Max torque": "22 Nm @ 8,500 rpm", "Bore × stroke": "78 × 52.3 mm", "Fuel system": "Carburettor (PZ-30)", "Gearbox": "6-speed" }
    }
  },
  {
    id: "voge-300rr", brand: "Voge", name: "300RR", style: "sport", beginner: true, price: 560000,
    tagline: "Full-fairing sport bike with USD forks and two-channel ABS.",
    cc: 292, power: "21 kW", weight: 153, top: 135, seat: 780, tank: 16, clearance: 165,
    goodFor: ["Sport riding", "Shorter riders", "Commute"],
    imgs: ["65df71ee6f2de87f344dd9c9.png", "65df71ee9e0a755cec83f154.png", "65df71ee6f2de8fd644dd9c8.png", "65df71ee9e0a7527c883f155.png", "65df71ee478a573c19edb580.png", "65df71ee3806e8bc715bbbeb.png"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "1,965 × 785 × 1,110 mm", "Wheelbase": "1,350 mm", "Seat height": "780 mm", "Ground clearance": "165 mm", "Net weight": "153 kg", "Top speed": "135 km/h", "Fuel tank": "16 L", "Tyres": "110/70-17 front, 150/60-17 rear" },
      Chassis: { "Front suspension": "Upside-down", "Rear suspension": "Single shock, styled swingarm", "Brakes": "Double disc front, disc rear", "ABS": "2-channel", "Wheels": "Alloy", "Lighting": "Full LED", "Display": "Digital" },
      Engine: { "Type": "Single cylinder, 4-stroke, liquid cooled", "Displacement": "292 cc", "Compression": "11 : 1", "Max power": "21 kW @ 9,000 rpm", "Max torque": "25 Nm @ 6,500 rpm", "Bore × stroke": "78 × 61.2 mm", "Fuel system": "EFI", "Gearbox": "6-speed" }
    }
  },
  {
    id: "voge-300r", brand: "Voge", name: "300R", style: "city", beginner: true, price: 520000,
    tagline: "Naked streetfighter, 140 kg and easy in traffic.",
    cc: 292, power: "21 kW", weight: 140, top: 135, seat: 780, tank: 16, clearance: 165,
    goodFor: ["City riding", "Shorter riders", "First big bike"],
    imgs: ["65df72bb41351f3c9e05df5e.png", "65df72bb550c51562526061e.png", "65df72bb2258711e9fa1c920.png", "65df72bb0d2da90f88635e11.png", "65df72bb9e0a7522d183f16b.png", "65df72bb5ca7ab3fb32beb67.png"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "1,965 × 785 × 1,070 mm", "Wheelbase": "1,350 mm", "Seat height": "780 mm", "Ground clearance": "165 mm", "Net weight": "140 kg", "Top speed": "135 km/h", "Fuel tank": "16 L", "Tyres": "110/70-17 front, 150/60-17 rear" },
      Chassis: { "Front suspension": "Upside-down", "Rear suspension": "Single shock", "Brakes": "Double disc front, disc rear", "ABS": "2-channel", "Wheels": "Alloy", "Lighting": "Full LED", "Display": "Digital" },
      Engine: { "Type": "Single cylinder, 4-stroke, liquid cooled", "Displacement": "292 cc", "Compression": "11 : 1", "Max power": "21 kW @ 9,000 rpm", "Max torque": "25 Nm @ 6,500 rpm", "Bore × stroke": "78 × 61.2 mm", "Fuel system": "EFI", "Gearbox": "6-speed" }
    }
  },
  {
    id: "voge-300ds", brand: "Voge", name: "300DS", style: "adventure", beginner: true, price: 580000,
    tagline: "Road-biased dual-sport on alloy wheels.",
    cc: 292, power: "21 kW", weight: 155, top: 130, seat: 810, tank: 16, clearance: 190,
    goodFor: ["Commute", "Weekend trips", "Mixed roads"],
    imgs: ["65b0a61a8b23d7cac9be23a5.png", "65b0a61aa716b3cb91fd7aeb.png", "65b0a61aa716b30417fd7aea.png", "65b0a61a7450222da12d6ed0.png", "65b0a61a8b23d74e09be23a4.png"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "2,035 × 820 × 1,360 mm", "Wheelbase": "1,435 mm", "Seat height": "810 mm", "Ground clearance": "190 mm", "Net weight": "155 kg", "Top speed": "130 km/h", "Fuel tank": "16 L", "Tyres": "110/70-17 front, 150/60-17 rear" },
      Chassis: { "Front suspension": "Upside-down", "Rear suspension": "Single shock, styled swingarm", "Brakes": "Disc front and rear", "ABS": "2-channel", "Wheels": "Alloy", "Lighting": "Full LED", "Display": "Digital" },
      Engine: { "Type": "Single cylinder, 4-stroke, liquid cooled", "Displacement": "292 cc", "Compression": "11 : 1", "Max power": "21 kW @ 9,000 rpm", "Max torque": "25 Nm @ 6,500 rpm", "Bore × stroke": "78 × 61.2 mm", "Fuel system": "EFI", "Gearbox": "6-speed" }
    }
  },
  {
    id: "voge-300gy-rally", brand: "Voge", name: "300GY Rally", style: "adventure", beginner: false, price: 620000,
    tagline: "280 mm of ground clearance and a 21-inch front wheel.",
    cc: 292, power: "21 kW", weight: 160, top: 140, seat: 850, tank: 12.5, clearance: 280,
    goodFor: ["Off-road", "Rally trips", "Tall riders"],
    imgs: ["65b0a06ea716b319f5fd61b5.png", "65b0a06ea716b338f9fd61b4.png", "65b0a06e8b23d7b5ddbe0b26.png", "65b0a06ea716b34074fd61ba.png", "65b0a06e74502200c52d4a6c.png"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "2,165 × 816 × 1,425 mm", "Wheelbase": "1,470 mm", "Seat height": "850 mm", "Ground clearance": "280 mm", "Net weight": "160 kg", "Top speed": "140 km/h", "Fuel tank": "12.5 L", "Tyres": "3.00-21 front, 120/90-18 rear" },
      Chassis: { "Front suspension": "Upside-down", "Rear suspension": "Single shock", "Brakes": "Disc front and rear", "ABS": "2-channel", "Wheels": "Spoke", "Lighting": "LED tail and indicators", "Display": "Digital" },
      Engine: { "Type": "Single cylinder, 4-stroke, liquid cooled", "Displacement": "292.4 cc", "Compression": "11 : 1", "Max power": "21 kW @ 8,500 rpm", "Max torque": "25 Nm @ 7,000 rpm", "Bore × stroke": "78 × 61.2 mm", "Fuel system": "EFI", "Gearbox": "6-speed" }
    }
  },
  {
    id: "voge-ds525x", brand: "Voge", name: "DS525X", style: "adventure", beginner: false, price: 950000,
    tagline: "Parallel-twin adventure tourer with KYB, Nissin and traction control.",
    cc: 494, power: "41 kW", weight: 190, top: 160, seat: 810, tank: 18, clearance: 200,
    goodFor: ["Long-distance touring", "Two-up trips", "Mixed roads"],
    imgs: ["65b09d8ba716b32c16fd5f39.png", "65b09d8ba716b34a17fd5f38.png", "65b09d8ca716b3800afd5f3b.png", "65b09d8c7450228e162d48d4.png", "65b09d8c745022869c2d48d3.png"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "2,170 × 820 × 1,380 mm", "Wheelbase": "1,456 mm", "Seat height": "810 / 830 mm", "Ground clearance": "200 mm", "Net weight": "190 kg", "Top speed": "160 km/h", "Fuel tank": "18 L", "Tyres": "Metzeler 110/80-19 front, 150/70-17 rear" },
      Chassis: { "Front suspension": "Upside-down, KYB", "Rear suspension": "Single shock, KYB", "Brakes": "Nissin dual disc front, disc rear", "ABS": "2-channel with traction control", "Wheels": "Spoke", "Lighting": "Full LED", "Display": "LCD" },
      Engine: { "Type": "Parallel twin, 8-valve, DOHC, liquid cooled", "Displacement": "494 cc", "Compression": "11.5 : 1", "Max power": "41 kW @ 9,000 rpm", "Max torque": "50.5 Nm @ 7,000 rpm", "Bore × stroke": "68 × 68 mm", "Fuel system": "EFI", "Gearbox": "6-speed" }
    }
  },
  {
    id: "voge-ds900x", brand: "Voge", name: "DS900X", style: "adventure", beginner: false, price: 1650000,
    tagline: "895 cc twin, Brembo brakes, adjustable KYB, TFT. The flagship.",
    cc: 895, power: "70 kW", weight: 221, top: 200, seat: 825, tank: 17, clearance: 190,
    goodFor: ["Cross-country touring", "Experienced riders", "Two-up trips"],
    imgs: ["65df70acfc239a38c9a8a75d.png", "65df70ac411b26705fa475a9.png", "65df70ad22ed8657f9cdf7c6.png", "65df70ad471cd5863e47c034.png", "65df70acdcc9fbebaf305cfc.jpeg", "65df70acdcc9fbb964305cfd.jpeg"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "2,325 × 940 × 1,420 mm", "Wheelbase": "1,580 mm", "Seat height": "825 mm", "Ground clearance": "190 mm", "Net weight": "221 kg", "Top speed": "200 km/h", "Fuel tank": "17 L", "Tyres": "90/90-21 front, 150/70-17 rear" },
      Chassis: { "Front suspension": "Upside-down KYB, adjustable preload & damping", "Rear suspension": "KYB, adjustable preload & damping", "Brakes": "Brembo dual disc front, Brembo rear", "ABS": "ABS with traction control", "Wheels": "Spoke", "Lighting": "Full LED", "Display": "TFT" },
      Engine: { "Type": "Parallel twin, DOHC, liquid cooled", "Displacement": "895 cc", "Compression": "13.1 : 1", "Max power": "70 kW @ 8,250 rpm", "Max torque": "95 Nm @ 6,250 rpm", "Bore × stroke": "86 × 77 mm", "Fuel system": "EFI", "Gearbox": "6-speed" }
    }
  },
  {
    id: "taro-gp2-200r", brand: "Taro", name: "GP2 200R", style: "sport", beginner: true, price: 320000,
    tagline: "Low 760 mm seat and sport looks. A confident first bike.",
    cc: 198, power: "16 hp", weight: 149, top: 140, seat: 760, tank: 12, clearance: 130,
    goodFor: ["First bike", "Shorter riders", "City riding"],
    imgs: ["65da265bde43c941441cacc2.png", "65da265c171bbce2a4a86c46.png"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "1,961 × 738 × 1,077 mm", "Wheelbase": "1,313 mm", "Seat height": "760 mm", "Ground clearance": "130 mm", "Net weight": "149 kg", "Top speed": "140 km/h", "Fuel tank": "12 L", "Tyres": "110/70-16 front, 140/70-16 rear" },
      Chassis: { "Front suspension": "Telescopic", "Rear suspension": "Telescopic", "Brakes": "Dual front, single rear (CBS)", "ABS": "Optional", "Wheels": "Alloy", "Lighting": "Dual LED", "Display": "Digital" },
      Engine: { "Type": "Single cylinder, 4-stroke, OHC, liquid cooled", "Displacement": "198 cc", "Compression": "10.7 : 1", "Max power": "16 hp @ 8,500 rpm", "Max torque": "14.5 Nm @ 8,000 rpm", "Fuel system": "EFI", "Gearbox": "Manual" }
    }
  },
  {
    id: "taro-gp1-250r", brand: "Taro", name: "GP1 250R", style: "sport", beginner: true, price: 390000,
    tagline: "Full-fairing 250 with a TFT dash and monoshock rear.",
    cc: 249, power: "19 hp", weight: 165, top: 135, seat: 800, tank: 16, clearance: 180,
    goodFor: ["Sport looks", "Commute", "First big bike"],
    imgs: ["65da2696de43c954db1cacc5.png", "65da2696cab0504d9b431e74.png", "65da2696171bbc5243a86c4a.png", "65da26967b760ff152af62d9.png"],
    specs: {
      Dimensions: { "Wheelbase": "1,442 mm", "Seat height": "800 mm", "Ground clearance": "180 mm", "Net weight": "165 kg", "Top speed": "135 km/h", "Fuel tank": "16 L", "Tyres": "110/70-17 front, 150/70-17 rear" },
      Chassis: { "Front suspension": "Telescopic", "Rear suspension": "Monoshock", "Brakes": "Dual front, single rear (CBS)", "ABS": "Optional", "Wheels": "Alloy", "Lighting": "Dual LED", "Display": "TFT" },
      Engine: { "Type": "Single cylinder, 4-stroke, OHC, oil cooled", "Displacement": "249 cc", "Max power": "19 hp @ 8,500 rpm", "Max torque": "17 Nm @ 6,500 rpm", "Bore × stroke": "55 × 52.4 mm", "Fuel system": "Carburettor (PZ-30)", "Gearbox": "Manual" }
    }
  },
  {
    id: "taro-gp1-400r", brand: "Taro", name: "GP1 400R", style: "sport", beginner: false, price: 650000,
    tagline: "389 cc twin, KYB and Öhlins, 175 km/h.",
    cc: 389, power: "41 hp", weight: 190, top: 175, seat: 800, tank: 16, clearance: 180,
    goodFor: ["Sport riding", "Highway", "Step-up bike"],
    imgs: ["65da26d6cab050e756431e7e.png", "65da26d6cab0501434431e7d.png", "65da26d61183996cba0246c7.png"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "2,060 × 712 × 1,155 mm", "Wheelbase": "1,442 mm", "Seat height": "800 mm", "Ground clearance": "180 mm", "Net weight": "190 kg", "Top speed": "175 km/h", "Fuel tank": "16 L", "Tyres": "110/70-17 front, 150/70-17 rear" },
      Chassis: { "Front suspension": "Inverted, KYB", "Rear suspension": "Öhlins monoshock, aluminium swingarm", "Brakes": "Dual front, single rear", "ABS": "Dual-channel", "Wheels": "Alloy", "Lighting": "Dual LED", "Display": "TFT" },
      Engine: { "Type": "Twin cylinder, DOHC, 4-stroke, liquid cooled", "Displacement": "389 cc", "Max power": "41.2 hp @ 9,000 rpm", "Max torque": "35 Nm @ 6,500 rpm", "Bore × stroke": "66 × 55.2 mm", "Fuel system": "EFI", "Gearbox": "Manual" }
    }
  },
  {
    id: "taro-c5-400sr", brand: "Taro", name: "C5-400SR", style: "sport", beginner: false, price: 680000,
    tagline: "401 cc twin, 187 km/h top speed, 163 kg.",
    cc: 401, power: "43 hp", weight: 163, top: 187, seat: 810, tank: 14.5, clearance: 185,
    goodFor: ["Sport riding", "Highway", "Experienced riders"],
    imgs: ["65da2b3dde43c903581cadbe.png", "65da2b3d7b760fe6faaf63a8.png"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "2,070 × 818 × 1,130 mm", "Wheelbase": "1,425 mm", "Seat height": "810 mm", "Ground clearance": "185 mm", "Net weight": "163 kg", "Top speed": "187 km/h", "Fuel tank": "14.5 L", "Tyres": "110/70-17 front, 150/70-17 rear" },
      Chassis: { "Front suspension": "Inverted, KYB", "Rear suspension": "Öhlins monoshock, aluminium swingarm", "Brakes": "Dual front, single rear", "ABS": "Equipped", "Wheels": "Alloy", "Lighting": "Dual LED", "Display": "TFT" },
      Engine: { "Type": "Twin cylinder, DOHC, 4-stroke, liquid cooled", "Displacement": "401 cc", "Max power": "43 hp @ 9,000 rpm", "Max torque": "38.5 Nm @ 6,500 rpm", "Bore × stroke": "88 × 63 mm", "Fuel system": "EFI", "Gearbox": "Manual" }
    }
  },
  {
    id: "zonsen-carrera-200", brand: "Zonsen", name: "Carrera 200", style: "city", beginner: true, price: 300000,
    tagline: "Retro scrambler. 130 kg, spoked wheels, easy to live with.",
    cc: 216.5, power: "15.5 hp", weight: 130, top: null, seat: 820, tank: 12, clearance: 160,
    goodFor: ["City riding", "First bike", "Retro style"],
    imgs: ["67c75566124fd671d5a5903c.png", "67c75566cd9cc5805b8bffee.png", "67c75566cd9cc56b4e8bffed.png", "67c7556603023cc725cb41c9.png"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "2,140 × 945 × 1,325 mm", "Wheelbase": "1,330 mm", "Seat height": "820 mm", "Ground clearance": "160 mm", "Net weight": "130 kg", "Fuel tank": "12 L", "Tyres": "90/90-19 front, 120/90-16 rear" },
      Chassis: { "Front suspension": "Telescopic fork", "Rear suspension": "Twin shocks", "Brakes": "276 mm disc front, 130 mm drum rear", "Wheels": "Spoked", "Lighting": "Halogen headlamp", "Display": "Digital" },
      Engine: { "Type": "Single cylinder, 4-stroke, air cooled", "Displacement": "216.5 cc", "Compression": "9.0 : 1", "Max power": "15.5 hp @ 8,500 rpm", "Max torque": "13.6 Nm @ 7,000 rpm", "Bore × stroke": "67 × 61.4 mm", "Fuel system": "Carburettor (PZ30)", "Gearbox": "5-speed" }
    }
  },
  {
    id: "zonsen-batllo-250r", brand: "Zonsen", name: "Batllo 250R", style: "city", beginner: true, price: 360000, photo: true,
    tagline: "EFI 250 with LED lights and hydraulic discs both ends.",
    cc: 249, power: "14 kW", weight: 165, top: 135, seat: 800, tank: 16, clearance: 160,
    goodFor: ["Commute", "First big bike", "Fuel economy"],
    imgs: ["67bb947f0f0b26340a059bd8.jpeg", "67bb952e0f0b267c2b059cc9.jpeg", "67c757644c68ff7d5e0d2b42.jpeg", "67bb952ea47a369253fdfeb1.jpeg", "67bb952e0f0b26b9a5059cca.jpeg", "67c75764b009c8157d968062.jpeg"],
    specs: {
      Dimensions: { "Overall size (L × W × H)": "2,080 × 800 × 1,100 mm", "Wheelbase": "1,370 mm", "Seat height": "800 mm", "Ground clearance": "160 mm", "Net weight": "160 – 170 kg", "Top speed": "135 km/h", "Fuel tank": "16 L", "Tyres": "110/70-17 front, 140/70-17 rear" },
      Chassis: { "Front suspension": "Telescopic fork", "Rear suspension": "Monoshock", "Brakes": "Hydraulic disc front (dual piston) and rear", "Wheels": "17-inch", "Lighting": "LED", "Display": "Digital" },
      Engine: { "Type": "Single cylinder, 4-stroke, air cooled, SOHC", "Displacement": "249 cc", "Compression": "9.2 : 1", "Max power": "14 kW (18.7 hp) @ 8,000 rpm", "Max torque": "19 Nm @ 6,000 rpm", "Bore × stroke": "72 × 61.2 mm", "Fuel system": "EFI", "Gearbox": "5-speed" }
    }
  }
];


/* ---------- Gear & accessories (indicative KES prices, editable in admin) ---------- */
var PRODUCTS = [
  { id: "helmet-full-face", name: "Full-face helmet", category: "Helmets", price: 9500, sizes: ["S","M","L","XL","XXL"], icon: "helmet", note: "DOT/ECE rated · fitted in store", badge: "Bestseller", stock: 24 },
  { id: "helmet-adventure", name: "Adventure helmet", category: "Helmets", price: 14500, sizes: ["M","L","XL"], icon: "helmet", note: "Peak and visor for ADV riders", stock: 9 },
  { id: "helmet-modular", name: "Flip-up modular helmet", category: "Helmets", price: 7500, sizes: ["M","L","XL"], icon: "helmet", note: "Lift the chin bar at stops", stock: 14 },
  { id: "jacket-mesh", name: "Mesh riding jacket", category: "Jackets", price: 12500, sizes: ["S","M","L","XL","XXL"], icon: "jacket", note: "Vented for Nairobi heat · CE armour", stock: 18 },
  { id: "jacket-touring", name: "Waterproof touring jacket", category: "Jackets", price: 18500, sizes: ["M","L","XL"], icon: "jacket", note: "Removable liner for long rains", stock: 7 },
  { id: "gloves-summer", name: "Summer riding gloves", category: "Gloves", price: 3500, sizes: ["S","M","L","XL"], icon: "gloves", note: "Knuckle protection · touchscreen tips", stock: 40 },
  { id: "gloves-gauntlet", name: "Gauntlet touring gloves", category: "Gloves", price: 5500, sizes: ["M","L","XL"], icon: "gloves", note: "Long cuff, waterproof", stock: 15 },
  { id: "boots-riding", name: "Riding boots", category: "Boots", price: 11000, sizes: ["40","41","42","43","44","45"], icon: "boot", note: "Ankle and shin protection", stock: 12 },
  { id: "starter-kit", name: "New rider starter kit", category: "Bundles", price: 24000, sizes: ["S","M","L","XL"], icon: "bag", note: "Full-face helmet, mesh jacket and gloves", badge: "Save KES 1,500", stock: 10 },
  { id: "phone-mount", name: "Handlebar phone mount", category: "Accessories", price: 2500, sizes: [], icon: "part", note: "Vibration-damped, fits most bars", stock: 30 },
  { id: "crash-bars", name: "Crash bars", category: "Accessories", price: 9500, sizes: [], icon: "part", note: "Model-specific, fitted on site", stock: 6 },
  { id: "gift-card", name: "Gift card", category: "Gift cards", price: 5000, sizes: ["5,000","10,000","20,000"], icon: "gift", note: "For gear, parts or a service", badge: "December gift", stock: 999 }
];

if (typeof module !== "undefined") module.exports = { BIKES, PRODUCTS };
