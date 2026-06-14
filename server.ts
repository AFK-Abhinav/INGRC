import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Helper to get profile model details for consistency
interface UserProfile {
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  idCard: string;
  isVerified: boolean;
  tier: 'Gold' | 'Platinum' | 'Silver';
  points: number;
  walletBalance: number;
}

export const getProfileForUser = (username: string): UserProfile => {
  if (username === 'voyager_01') {
    return {
      name: 'Arjun Ramesh',
      email: 'arjun.ramesh@email.com',
      phone: '+91 98765 43210',
      dob: '14 Mar 1992',
      gender: 'Male',
      idCard: '••••  ••••  3421',
      isVerified: true,
      tier: 'Gold',
      points: 1240,
      walletBalance: 580,
    };
  }
  
  if (username === 'voyager_elite_guest') {
    return {
      name: 'Voyager Elite',
      email: 'elite.guest@ingrc.net',
      phone: '+91 99011 22334',
      dob: '01 Jan 1995',
      gender: 'Other',
      idCard: '••••  ••••  7782',
      isVerified: true,
      tier: 'Platinum',
      points: 4500,
      walletBalance: 1500,
    };
  }

  if (username.startsWith('voyager_')) {
    const suffix = username.replace('voyager_', '');
    return {
      name: `Voyager ${suffix}`,
      email: `voyager_${suffix}@ingrc.net`,
      phone: `+91 91100 ${suffix}`,
      dob: '20 Aug 1990',
      gender: 'Male',
      idCard: '••••  ••••  8829',
      isVerified: true,
      tier: 'Silver',
      points: 420,
      walletBalance: 150,
    };
  }

  const prettifyUsername = (str: string) => {
    const cleanStr = str.includes('@') ? str.split('@')[0] : str;
    const parts = cleanStr.split(/[@._-]/);
    return parts
      .filter(p => isNaN(Number(p)) && p.length > 0)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ') || cleanStr;
  };

  const cleanName = prettifyUsername(username);

  return {
    name: cleanName,
    email: username.includes('@') ? username : `${username}@email.com`,
    phone: '+91 98112 23344',
    dob: '15 Jul 1998',
    gender: 'Male',
    idCard: '••••  ••••  5512',
    isVerified: true,
    tier: 'Silver',
    points: 120,
    walletBalance: 200,
  };
};

// Load railway datasets in memory
let stationsData: any = { features: [] };
let trainsData: any = { features: [] };

try {
  const stationsPath = path.join(process.cwd(), 'src', 'data', 'raw', 'stations.json');
  const trainsPath = path.join(process.cwd(), 'src', 'data', 'raw', 'trains.json');
  
  if (fs.existsSync(stationsPath)) {
    stationsData = JSON.parse(fs.readFileSync(stationsPath, 'utf8'));
    console.log(`Loaded ${stationsData.features.length} stations from dataset.`);
  } else {
    console.warn("Stations dataset file not found at:", stationsPath);
  }
  
  if (fs.existsSync(trainsPath)) {
    trainsData = JSON.parse(fs.readFileSync(trainsPath, 'utf8'));
    console.log(`Loaded ${trainsData.features.length} trains from dataset.`);
  } else {
    console.warn("Trains dataset file not found at:", trainsPath);
  }
} catch (err) {
  console.error("Failed to load railway datasets:", err);
}

// Distance calculation helper (Haversine formula in KM)
function getDistanceKM(coord1: [number, number], coord2: [number, number]): number {
  if (!coord1 || !coord2) return 0;
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

// Station finder helper (resolves code or name)
function findStation(inputStr: string): any {
  if (!inputStr) return null;
  const cleanStr = inputStr.trim().toLowerCase();
  
  // Extract station code inside brackets if present, e.g., "New Delhi (NDLS)" -> "NDLS"
  const bracketMatch = cleanStr.match(/\(([^)]+)\)/);
  const searchCode = bracketMatch ? bracketMatch[1].trim() : cleanStr;
  
  // Try exact match on code
  let found = stationsData.features.find((f: any) => 
    (f.properties.code || "").toLowerCase() === searchCode
  );
  
  if (found) return found;

  // Try substring match on code or name
  found = stationsData.features.find((f: any) => {
    const code = (f.properties.code || "").toLowerCase();
    const name = (f.properties.name || "").toLowerCase();
    return code === cleanStr || name.includes(cleanStr) || cleanStr.includes(name);
  });
  
  return found || null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  // API - Search stations
  app.get("/api/stations", (req, res) => {
    const query = (req.query.q as string || "").trim().toLowerCase();
    if (!query) {
      return res.json([]);
    }
    
    const matches = stationsData.features
      .filter((f: any) => {
        const name = (f.properties.name || "").toLowerCase();
        const code = (f.properties.code || "").toLowerCase();
        return name.includes(query) || code.includes(query);
      })
      .slice(0, 15)
      .map((f: any) => ({
        name: f.properties.name,
        code: f.properties.code,
        state: f.properties.state,
        zone: f.properties.zone,
        coordinates: f.geometry?.coordinates || null,
        address: f.properties.address
      }));
      
    res.json(matches);
  });

  // API - Popular trains list
  app.get("/api/trains/popular", (req, res) => {
    const premiumKeywords = ["vande", "rajdhani", "shatabdi", "duronto", "express"];
    const premiumTrains = trainsData.features
      .filter((f: any) => {
        const name = (f.properties.name || "").toLowerCase();
        return premiumKeywords.some(keyword => name.includes(keyword));
      })
      .slice(0, 20);
      
    const pool = premiumTrains.length > 0 ? premiumTrains : trainsData.features.slice(0, 20);
    
    const formatted = pool.slice(0, 6).map((f: any, index: number) => {
      const props = f.properties;
      const types: ('FASTEST' | 'BEST VALUE' | 'RELIABILITY' | 'STANDARD')[] = ['FASTEST', 'BEST VALUE', 'RELIABILITY', 'STANDARD'];
      const type = types[index % types.length];
      const typeLabel = type === 'FASTEST' ? 'FASTEST' : type === 'BEST VALUE' ? 'BEST VALUE' : type === 'RELIABILITY' ? '99% RELIABILITY' : 'STANDARD';
      
      const dist = props.distance || 500;
      const price = Math.round(dist * 1.5 + 200);
      const duration = `${props.duration_h || Math.floor(dist/80)}h ${props.duration_m || 30}m`;
      
      const departureTime = props.departure ? props.departure.substring(0, 5) : '08:00';
      const arrivalTime = props.arrival ? props.arrival.substring(0, 5) : '16:30';
      
      return {
        number: props.number || `TR-${100 + index}`,
        name: props.name || 'Express Connect',
        type: type,
        typeLabel: typeLabel,
        duration: duration,
        price: price,
        reliability: 90 + (index % 10),
        departureTime: departureTime,
        arrivalTime: arrivalTime,
        origin: `${props.from_station_name} (${props.from_station_code})`,
        destination: `${props.to_station_name} (${props.to_station_code})`
      };
    });
    
    res.json(formatted);
  });

  // API - Route planner
  app.get("/api/routes", (req, res) => {
    const originStr = req.query.origin as string;
    const destStr = req.query.destination as string;
    
    if (!originStr || !destStr) {
      return res.status(400).json({ error: "Missing origin or destination parameters" });
    }
    
    const originStation = findStation(originStr);
    const destStation = findStation(destStr);
    
    if (!originStation || !destStation) {
      return res.json([]);
    }
    
    const originCode = originStation.properties.code;
    const destCode = destStation.properties.code;
    
    // 1. Search for direct trains
    const directTrains = trainsData.features.filter((f: any) => 
      f.properties.from_station_code === originCode && f.properties.to_station_code === destCode
    );
    
    const routes: any[] = [];
    
    const buildRouteOption = (train: any, id: string) => {
      const props = train.properties;
      const distance = props.distance || getDistanceKM(originStation.geometry.coordinates, destStation.geometry.coordinates) || 500;
      
      const fares = [
        { label: `${originCode} → ${destCode} (3A)`, amount: Math.round(distance * 1.2 + 150) },
        { label: `${originCode} → ${destCode} (2A)`, amount: Math.round(distance * 1.8 + 250) }
      ];
      const dynamicFee = Math.round(distance * 0.15 + 45);
      const totalFare = fares.reduce((sum, f) => sum + f.amount, 0) / fares.length + dynamicFee;
      
      const duration = `${props.duration_h || Math.floor(distance / 75)}H ${props.duration_m || 15}M`;
      const departureTime = props.departure ? props.departure.substring(0, 5) : '08:00';
      const arrivalTime = props.arrival ? props.arrival.substring(0, 5) : '18:30';
      
      return {
        id,
        confidence: 85 + Math.floor(Math.random() * 14),
        duration,
        departureTime,
        arrivalTime,
        origin: `${originStation.properties.name} (${originCode})`,
        destination: `${destStation.properties.name} (${destCode})`,
        transfers: 0,
        transferPoints: [],
        badges: ['Direct Match', 'G-Link'],
        fares,
        dynamicFee,
        totalFare: Math.round(totalFare),
        segments: [
          {
            trainNumber: props.number || 'RM-101',
            trainName: props.name || 'Express Connect',
            origin: `${originStation.properties.name} (${originCode})`,
            destination: `${destStation.properties.name} (${destCode})`,
            platform: `0${1 + Math.floor(Math.random() * 8)}`,
            departureTime,
            arrivalTime,
            cabin: '3AC Sleeper Class',
            coach: 'A1',
            status: 'CONFIRMED',
            features: ['G-Link Wifi included', 'USB Outlets', 'Onboard Dining Available']
          }
        ]
      };
    };

    // Add direct trains
    directTrains.slice(0, 3).forEach((train: any, idx: number) => {
      routes.push(buildRouteOption(train, `RT-DIR-${idx + 100}`));
    });
    
    // 2. Search for 1-transfer connections if needed
    if (routes.length === 0) {
      const fromOrigin = trainsData.features.filter((f: any) => f.properties.from_station_code === originCode);
      const toDest = trainsData.features.filter((f: any) => f.properties.to_station_code === destCode);
      
      const matches: { t1: any, t2: any, transferCode: string }[] = [];
      
      for (const t1 of fromOrigin.slice(0, 200)) {
        const t1Dest = t1.properties.to_station_code;
        const t2 = toDest.find((t: any) => t.properties.from_station_code === t1Dest);
        if (t2) {
          matches.push({ t1, t2, transferCode: t1Dest });
          if (matches.length >= 2) break;
        }
      }
      
      matches.forEach((m, idx) => {
        const transferStation = findStation(m.transferCode);
        const transferName = transferStation ? transferStation.properties.name : m.transferCode;
        
        const dist1 = m.t1.properties.distance || getDistanceKM(originStation.geometry.coordinates, (transferStation?.geometry.coordinates || originStation.geometry.coordinates)) || 300;
        const dist2 = m.t2.properties.distance || getDistanceKM((transferStation?.geometry.coordinates || destStation.geometry.coordinates), destStation.geometry.coordinates) || 300;
        
        const dep1 = m.t1.properties.departure ? m.t1.properties.departure.substring(0, 5) : '07:00';
        const arr1 = m.t1.properties.arrival ? m.t1.properties.arrival.substring(0, 5) : '13:00';
        const dep2 = m.t2.properties.departure ? m.t2.properties.departure.substring(0, 5) : '14:30';
        const arr2 = m.t2.properties.arrival ? m.t2.properties.arrival.substring(0, 5) : '21:00';
        
        const totalDist = dist1 + dist2;
        const fares = [
          { label: `${originCode} → ${m.transferCode} (SL)`, amount: Math.round(dist1 * 0.6 + 50) },
          { label: `${m.transferCode} → ${destCode} (3A)`, amount: Math.round(dist2 * 1.2 + 100) }
        ];
        const dynamicFee = Math.round(totalDist * 0.12 + 35);
        const totalFare = fares.reduce((sum, f) => sum + f.amount, 0) + dynamicFee;
        
        const totalHours = (m.t1.properties.duration_h || 6) + (m.t2.properties.duration_h || 6) + 1;
        
        routes.push({
          id: `RT-CONN-${idx + 200}`,
          confidence: 80 + Math.floor(Math.random() * 10),
          duration: `${totalHours}H 45M`,
          departureTime: dep1,
          arrivalTime: arr2,
          origin: `${originStation.properties.name} (${originCode})`,
          destination: `${destStation.properties.name} (${destCode})`,
          transfers: 1,
          transferPoints: [m.transferCode],
          badges: ['Best Layover', 'Eco Option'],
          fares,
          dynamicFee,
          totalFare,
          segments: [
            {
              trainNumber: m.t1.properties.number || 'RM-T1',
              trainName: m.t1.properties.name || 'Connector Link 1',
              origin: `${originStation.properties.name} (${originCode})`,
              destination: `${transferName} (${m.transferCode})`,
              platform: '03',
              departureTime: dep1,
              arrivalTime: arr1,
              cabin: 'Sleeper Class',
              coach: 'S2',
              status: 'CONFIRMED',
              features: ['USB Outlets', 'Onboard Catering']
            },
            {
              trainNumber: m.t2.properties.number || 'RM-T2',
              trainName: m.t2.properties.name || 'Connector Link 2',
              origin: `${transferName} (${m.transferCode})`,
              destination: `${destStation.properties.name} (${destCode})`,
              platform: '05',
              departureTime: dep2,
              arrivalTime: arr2,
              cabin: '3AC Sleeper Class',
              coach: 'B1',
              status: 'CONFIRMED',
              features: ['G-Link Wifi included', 'Panoramic Windows']
            }
          ]
        });
      });
    }
    
    // 3. Fallback: Generate realistic synthetic routes if no routes are found in database
    if (routes.length === 0) {
      const distance = getDistanceKM(originStation.geometry.coordinates, destStation.geometry.coordinates) || 500;
      
      const routePresets = [
        { name: "Vande Bharat Kinetic", type: "FASTEST", badge: "Kinetic", speed: 110, fareMult: 2.2, classStr: "Executive CC" },
        { name: "Rajdhani Superfast", type: "BEST VALUE", badge: "Best Value", speed: 85, fareMult: 1.5, classStr: "3AC Tier" },
        { name: "Express Connect", type: "RELIABILITY", badge: "99% Reliability", speed: 70, fareMult: 0.8, classStr: "Sleeper Class" }
      ];
      
      routePresets.forEach((preset, idx) => {
        const speed = preset.speed;
        const hours = Math.floor(distance / speed);
        const mins = Math.round(((distance / speed) - hours) * 60);
        const duration = `${hours}H ${mins}M`;
        
        const depHours = (6 + idx * 4) % 24;
        const depMins = 15 + idx * 10;
        const departureTime = `${String(depHours).padStart(2, '0')}:${String(depMins).padStart(2, '0')}`;
        
        const arrHours = (depHours + hours) % 24;
        const arrMins = (depMins + mins) % 60;
        const arrivalTime = `${String(arrHours).padStart(2, '0')}:${String(arrMins).padStart(2, '0')}`;
        
        const baseFare = Math.round(distance * preset.fareMult);
        const fares = [
          { label: `${originCode} → ${destCode} (${preset.classStr})`, amount: baseFare }
        ];
        const dynamicFee = Math.round(baseFare * 0.1);
        const totalFare = baseFare + dynamicFee;
        
        routes.push({
          id: `RT-SYN-${idx + 300}`,
          confidence: 90 - idx * 5,
          duration,
          departureTime,
          arrivalTime,
          origin: `${originStation.properties.name} (${originCode})`,
          destination: `${destStation.properties.name} (${destCode})`,
          transfers: 0,
          transferPoints: [],
          badges: [preset.badge, 'G-Link'],
          fares,
          dynamicFee,
          totalFare,
          segments: [
            {
              trainNumber: `VB-22${400 + idx}`,
              trainName: `${preset.name} (${originCode} → ${destCode})`,
              origin: `${originStation.properties.name} (${originCode})`,
              destination: `${destStation.properties.name} (${destCode})`,
              platform: `0${1 + idx}`,
              departureTime,
              arrivalTime,
              cabin: preset.classStr,
              coach: 'C1',
              status: 'CONFIRMED',
              features: ['G-Link Wifi included', 'Premium Dining', 'USB Outlets']
            }
          ]
        });
      });
    }
    
    res.json(routes);
  });

  // Serve static assets in production, otherwise pass to Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`INGRC Train server booting... listening on port ${PORT}`);
  });
}

startServer();

