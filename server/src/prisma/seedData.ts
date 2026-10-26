import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  console.log("Seeding ResQAI database with verified emergency facilities and test account...");

  try {
    // 1. Seed Demo User
    const demoEmail = "demo@rakshai.org";
    const passwordHash = await bcrypt.hash("RakshAI123", 10);
    
    let user = await prisma.user.findUnique({
      where: { email: demoEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "Alex Mercer",
          email: demoEmail,
          passwordHash,
          phoneNumber: "+91-9876543210",
          countryCode: "+91",
        },
      });
      console.log(`Created demo user: ${demoEmail} (Password: RakshAI123)`);

      // Add Demo Emergency Contacts
      await prisma.emergencyContact.createMany({
        data: [
          {
            userId: user.id,
            name: "Sarah Mercer (Spouse)",
            relationship: "Spouse",
            phone: "+91-9876543211",
            isPrimary: true,
          },
          {
            userId: user.id,
            name: "Dr. Vikram Sharma (Physician)",
            relationship: "Doctor",
            phone: "+91-9876543212",
            isPrimary: false,
          },
        ],
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      console.log(`Updated demo user password for: ${demoEmail}`);
    }

    // 2. Clear & repopulate existing facilities
    await prisma.hospital.deleteMany({});
    await prisma.fireService.deleteMany({});
    await prisma.emergencyResource.deleteMany({
      where: { isDemo: true },
    });

    // 3. Seed Verified Demo Hospitals
    const hospitalsData = [
      // Pune / Hinjawadi Region (Covering 18.6111, 73.71857)
      {
        name: "Ruby Hall Clinic (Hinjawadi)",
        category: "PRIVATE",
        address: "Hinjawadi Phase 1, Rajiv Gandhi Infotech Park, Pune, Maharashtra 411057",
        latitude: 18.5913,
        longitude: 73.7389,
        phone: "+91-20-66455500",
        ambulancePhone: "+91-20-66455555",
        emergencyDepartment: "24/7 Multi-Specialty Emergency & ICU, Trauma Care Unit",
        source: "DEMO DATA - Pune District Healthcare Registry",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Aditya Birla Memorial Hospital",
        category: "PRIVATE",
        address: "Aditya Birla Hospital Marg, Thergaon, Chinchwad, Pune 411033",
        latitude: 18.6189,
        longitude: 73.7745,
        phone: "+91-20-30717500",
        ambulancePhone: "+91-20-30717666",
        emergencyDepartment: "Level 1 Emergency & Trauma Care, Certified Stroke & Cardiac Center",
        source: "DEMO DATA - Maharashtra Healthcare Registry",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "PCMC Talera Municipal Hospital",
        category: "GOVERNMENT",
        address: "Station Road, Chinchwad Gaon, Pimpri-Chinchwad, Pune 411033",
        latitude: 18.6300,
        longitude: 73.7850,
        phone: "+91-20-27351234",
        ambulancePhone: "+91-20-27351108",
        emergencyDepartment: "Municipal 24/7 Casualty & Government Emergency Ward",
        source: "DEMO DATA - PCMC Municipal Health Services",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Jupiter Hospital Pune",
        category: "PRIVATE",
        address: "Near Balewadi Stadium, Mumbai-Pune Expressway, Baner, Pune 411045",
        latitude: 18.5684,
        longitude: 73.7738,
        phone: "+91-20-27992799",
        ambulancePhone: "+91-20-27992999",
        emergencyDepartment: "24/7 Comprehensive Emergency Medicine, Polytrauma & Resuscitation",
        source: "DEMO DATA - NABH Accredited Hospital Directory",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Aundh District Civil Hospital",
        category: "GOVERNMENT",
        address: "Aundh Camp, Sangvi Phata, Pune, Maharashtra 411027",
        latitude: 18.5802,
        longitude: 73.8052,
        phone: "+91-20-27282000",
        ambulancePhone: "+91-20-27282108",
        emergencyDepartment: "Government District Civil Hospital, 24/7 Emergency & Trauma",
        source: "DEMO DATA - Government of Maharashtra Health Services",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Yashwantrao Chavan Memorial Hospital (YCM Hospital)",
        category: "GOVERNMENT",
        address: "Sant Tukaram Nagar, Pimpri, Pune, Maharashtra 411018",
        latitude: 18.6256,
        longitude: 73.8202,
        phone: "+91-20-27420100",
        ambulancePhone: "+91-20-27420108",
        emergencyDepartment: "24/7 Government Apex Emergency, Trauma & ICU Center",
        source: "DEMO DATA - PCMC Health Department Directory",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Manipal Hospital Baner",
        category: "PRIVATE",
        address: "Survey No. 10/A, Baner Road, Pune, Maharashtra 411045",
        latitude: 18.5580,
        longitude: 73.7910,
        phone: "+91-20-68138888",
        ambulancePhone: "+91-20-68138899",
        emergencyDepartment: "24-Hour Emergency Medicine & Intensive Care Unit",
        source: "DEMO DATA - Private Healthcare Network",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Sassoon General Hospital & B.J. Medical College",
        category: "GOVERNMENT",
        address: "Near Pune Railway Station, Sassoon Road, Pune, Maharashtra 411001",
        latitude: 18.5284,
        longitude: 73.8742,
        phone: "+91-20-26128000",
        ambulancePhone: "+91-20-26127000",
        emergencyDepartment: "Level 1 State Apex Trauma & Emergency Resuscitation Center",
        source: "DEMO DATA - Directorate of Medical Education & Research",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      // San Francisco
      {
        name: "Zuckerberg San Francisco General Hospital & Trauma Center",
        category: "GOVERNMENT",
        address: "1001 Potrero Ave, Building 5, San Francisco, CA 94110",
        latitude: 37.7558,
        longitude: -122.4046,
        phone: "+1-628-206-8000",
        ambulancePhone: "+1-628-206-8111",
        emergencyDepartment: "Level 1 Trauma Center, 24/7 Adult & Pediatric Emergency Care, Burn Unit",
        source: "DEMO DATA - SF Department of Public Health Directory",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "UCSF Medical Center at Parnassus Heights",
        category: "GOVERNMENT",
        address: "505 Parnassus Ave, San Francisco, CA 94143",
        latitude: 37.7631,
        longitude: -122.4578,
        phone: "+1-415-476-1000",
        ambulancePhone: "+1-415-353-1037",
        emergencyDepartment: "Comprehensive Emergency Dept, Stroke Center, Cardiac Resuscitation",
        source: "DEMO DATA - University of California Health Registry",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "San Francisco Veterans Affairs Medical Center",
        category: "GOVERNMENT",
        address: "4150 Clement St, San Francisco, CA 94121",
        latitude: 37.7825,
        longitude: -122.5050,
        phone: "+1-415-221-4810",
        ambulancePhone: "+1-415-750-2138",
        emergencyDepartment: "VA 24/7 Urgent & Emergency Care Unit, Disaster Response Command",
        source: "DEMO DATA - U.S. Dept of Veterans Affairs Health Directory",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Sutter Health CPMC Van Ness Campus Hospital",
        category: "PRIVATE",
        address: "1101 Van Ness Ave, San Francisco, CA 94109",
        latitude: 37.7876,
        longitude: -122.4222,
        phone: "+1-415-600-6000",
        ambulancePhone: "+1-415-600-3333",
        emergencyDepartment: "Certified STEMI Receiving Center, 24-Hour Acute Care, Helipad Access",
        source: "DEMO DATA - California Health Licensing",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Kaiser Permanente San Francisco Medical Center",
        category: "PRIVATE",
        address: "2425 Geary Blvd, San Francisco, CA 94115",
        latitude: 37.7828,
        longitude: -122.4431,
        phone: "+1-415-833-2000",
        ambulancePhone: "+1-415-833-2222",
        emergencyDepartment: "24-Hour Emergency Services, Advanced Cardiac & Neurological Intervention",
        source: "DEMO DATA - Kaiser Permanente Network",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Saint Francis Memorial Hospital & Bothin Burn Center",
        category: "PRIVATE",
        address: "900 Hyde St, San Francisco, CA 94109",
        latitude: 37.7898,
        longitude: -122.4173,
        phone: "+1-415-353-6000",
        ambulancePhone: "+1-415-353-6300",
        emergencyDepartment: "Accredited Bothin Burn Center, 24/7 Emergency Care, Occupational Trauma",
        source: "DEMO DATA - Dignity Health Facilities",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      // New York City
      {
        name: "NYC Health + Hospitals / Bellevue",
        category: "GOVERNMENT",
        address: "462 1st Ave, New York, NY 10016",
        latitude: 40.7397,
        longitude: -73.9757,
        phone: "+1-212-562-4141",
        ambulancePhone: "+1-212-562-3333",
        emergencyDepartment: "Level 1 Trauma Center, 24/7 Pediatric & Adult Emergency Medicine",
        source: "DEMO DATA - NYC Health + Hospitals Directory",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "NewYork-Presbyterian / Weill Cornell Medical Center",
        category: "PRIVATE",
        address: "525 E 68th St, New York, NY 10065",
        latitude: 40.7654,
        longitude: -73.9542,
        phone: "+1-212-746-5454",
        ambulancePhone: "+1-212-746-5000",
        emergencyDepartment: "Comprehensive Emergency Services, William Randolph Hearst Burn Center",
        source: "DEMO DATA - NYS Department of Health",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      // London
      {
        name: "St Thomas' Hospital (NHS Foundation Trust)",
        category: "GOVERNMENT",
        address: "Westminster Bridge Rd, London SE1 7EH, UK",
        latitude: 51.4988,
        longitude: -0.1186,
        phone: "+44-20-7188-7188",
        ambulancePhone: "+44-20-7188-2111",
        emergencyDepartment: "24-Hour NHS A&E (Accident & Emergency) Department",
        source: "DEMO DATA - UK NHS Service Directory",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "The London Clinic Medical Centre",
        category: "PRIVATE",
        address: "20 Devonshire Pl, London W1G 6BW, UK",
        latitude: 51.5222,
        longitude: -0.1495,
        phone: "+44-20-7935-4444",
        ambulancePhone: "+44-20-7935-5000",
        emergencyDepartment: "Urgent Medical Assessment & Acute Surgical Admission",
        source: "DEMO DATA - Independent Healthcare Network",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      // Mumbai
      {
        name: "KEM Hospital & Seth GS Medical College",
        category: "GOVERNMENT",
        address: "Acharya Donde Marg, Parel, Mumbai, Maharashtra 400012",
        latitude: 19.0033,
        longitude: 72.8427,
        phone: "+91-22-2410-7000",
        ambulancePhone: "+91-22-2413-6051",
        emergencyDepartment: "24/7 Municipal Trauma Centre & Critical Care Unit",
        source: "DEMO DATA - Brihanmumbai Municipal Corporation",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Lilavati Hospital & Research Centre",
        category: "PRIVATE",
        address: "A-791, Bandra Reclamation, Bandra West, Mumbai 400050",
        latitude: 19.0518,
        longitude: 72.8290,
        phone: "+91-22-2675-1000",
        ambulancePhone: "+91-22-2675-1555",
        emergencyDepartment: "Emergency & Critical Care, Cardiac Emergency Response",
        source: "DEMO DATA - National Health Authority Directory",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      // Tokyo
      {
        name: "Tokyo Metropolitan Hiroo Hospital",
        category: "GOVERNMENT",
        address: "2-34-10 Ebisu, Shibuya City, Tokyo 150-0013",
        latitude: 35.6481,
        longitude: 139.7153,
        phone: "+81-3-3444-1181",
        ambulancePhone: "+81-3-3444-1182",
        emergencyDepartment: "Metropolitan Disaster Base Hospital & Emergency Critical Center",
        source: "DEMO DATA - Tokyo Metropolitan Health Authority",
        lastVerified: "2026-08-01",
        isActive: true,
      },
    ];

    for (const h of hospitalsData) {
      await prisma.hospital.create({ data: h });
    }

    // 4. Seed Verified Fire Services
    const fireServicesData = [
      // Pune / Hinjawadi Fire Stations
      {
        name: "Hinjawadi MIDC Fire Station",
        address: "Phase 1, MIDC Infotech Park, Hinjawadi, Pune, Maharashtra 411057",
        latitude: 18.5940,
        longitude: 73.7310,
        phone: "+91-20-22933101",
        emergencyContact: "+91-20-22933000",
        source: "DEMO DATA - MIDC Fire & Disaster Management",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "PCMC Rahatani / Pimple Saudagar Fire Station",
        address: "Kokane Chowk, Rahatani Road, Pimple Saudagar, Pune, Maharashtra 411027",
        latitude: 18.5980,
        longitude: 73.7880,
        phone: "+91-20-27401101",
        emergencyContact: "+91-20-2740101",
        source: "DEMO DATA - PCMC Fire Brigade Department",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "PCMC Pradhikaran Nigdi Fire HQ",
        address: "Sector 24, Pradhikaran, Nigdi, Pimpri-Chinchwad, Pune 411044",
        latitude: 18.6580,
        longitude: 73.7710,
        phone: "+91-20-27651001",
        emergencyContact: "+91-20-27651101",
        source: "DEMO DATA - PCMC Fire Command",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Pune Municipal Fire Brigade (Aundh / Pashan Station)",
        address: "University Road, Aundh, Pune, Maharashtra 411007",
        latitude: 18.5520,
        longitude: 73.8050,
        phone: "+91-20-25506000",
        emergencyContact: "+91-20-25506101",
        source: "DEMO DATA - Pune Fire Brigade Headquarters",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      // San Francisco
      {
        name: "San Francisco Fire Department Station 1 (HQ / Engine 1)",
        address: "935 Folsom St, San Francisco, CA 94107",
        latitude: 37.7797,
        longitude: -122.4042,
        phone: "+1-415-558-3200",
        emergencyContact: "+1-415-558-3201",
        source: "DEMO DATA - San Francisco Fire Department Directory",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "SFFD Station 7 (Civic Center Hazmat & Rescue 1)",
        address: "676 Howard St, San Francisco, CA 94105",
        latitude: 37.7871,
        longitude: -122.3995,
        phone: "+1-415-558-3207",
        emergencyContact: "+1-415-558-3200",
        source: "DEMO DATA - SFFD Operational Bureau & HazMat Command",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "SFFD Station 36 (Civic Center / Tenderloin Battalion 2)",
        address: "109 Oak St, San Francisco, CA 94102",
        latitude: 37.7745,
        longitude: -122.4208,
        phone: "+1-415-558-3236",
        emergencyContact: "+1-415-558-3200",
        source: "DEMO DATA - SFFD Station Directory",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "SFFD Station 14 (Inner Richmond Engine & Truck 14)",
        address: "1091 Post St, San Francisco, CA 94109",
        latitude: 37.7869,
        longitude: -122.4191,
        phone: "+1-415-558-3214",
        emergencyContact: "+1-415-558-3200",
        source: "DEMO DATA - SFFD Firehouse Sector 3",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "SFFD Station 35 (Pier 22½ Marine Fireboat Station)",
        address: "Pier 22 1/2 The Embarcadero, San Francisco, CA 94105",
        latitude: 37.7904,
        longitude: -122.3892,
        phone: "+1-415-558-3235",
        emergencyContact: "+1-415-558-3200",
        source: "DEMO DATA - SFFD Maritime Fire & Rescue Command",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "FDNY Engine 10 / Ladder 10 (World Trade Center Station)",
        address: "124 Liberty St, New York, NY 10006",
        latitude: 40.7107,
        longitude: -74.0125,
        phone: "+1-718-999-2000",
        emergencyContact: "+1-718-999-1111",
        source: "DEMO DATA - Fire Department of New York (FDNY)",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "London Fire Brigade - Lambeth Fire Station",
        address: "8 Albert Embankment, London SE1 7SP, UK",
        latitude: 51.4905,
        longitude: -0.1215,
        phone: "+44-20-8555-1200",
        emergencyContact: "+44-20-8555-9999",
        source: "DEMO DATA - London Fire and Emergency Authority",
        lastVerified: "2026-08-01",
        isActive: true,
      },
      {
        name: "Mumbai Fire Brigade - Byculla Fire Command HQ",
        address: "Bapurao Jagtap Marg, Byculla West, Mumbai 400008",
        latitude: 18.9749,
        longitude: 72.8315,
        phone: "+91-22-2307-6111",
        emergencyContact: "+91-22-2308-5991",
        source: "DEMO DATA - Municipal Corporation of Greater Mumbai Fire Dept",
        lastVerified: "2026-08-01",
        isActive: true,
      },
    ];

    for (const f of fireServicesData) {
      await prisma.fireService.create({ data: f });
    }

    // 5. Seed Emergency Resources for Unified Resource APIs
    const demoResources = [
      {
        name: "Zuckerberg SF General Trauma ER",
        type: "HOSPITAL",
        phone: "+1-628-206-8000",
        latitude: 37.7558,
        longitude: -122.4046,
        address: "1001 Potrero Ave, SF, CA 94110",
        availability: "AVAILABLE",
        isDemo: true,
      },
      {
        name: "Sutter CPMC Van Ness Emergency",
        type: "HOSPITAL",
        phone: "+1-415-600-6000",
        latitude: 37.7876,
        longitude: -122.4222,
        address: "1101 Van Ness Ave, SF, CA 94109",
        availability: "AVAILABLE",
        isDemo: true,
      },
      {
        name: "SFFD Station 1 Heavy Engine Unit",
        type: "FIRE_SERVICE",
        phone: "+1-415-558-3200",
        latitude: 37.7797,
        longitude: -122.4042,
        address: "935 Folsom St, SF, CA 94107",
        availability: "AVAILABLE",
        isDemo: true,
      },
      {
        name: "SFFD Station 36 Civic Center Ladder",
        type: "FIRE_SERVICE",
        phone: "+1-415-558-3236",
        latitude: 37.7745,
        longitude: -122.4208,
        address: "109 Oak St, SF, CA 94102",
        availability: "AVAILABLE",
        isDemo: true,
      },
      {
        name: "SF Rapid Response Paramedic Ambulance Unit 12",
        type: "AMBULANCE",
        phone: "+1-628-206-8111",
        latitude: 37.7790,
        longitude: -122.4180,
        address: "Station 12 - 450 Golden Gate Ave, Civic Center",
        availability: "AVAILABLE",
        isDemo: true,
      },
      {
        name: "Mission Base ALS Ambulance Unit 4",
        type: "AMBULANCE",
        phone: "+1-415-600-3333",
        latitude: 37.7650,
        longitude: -122.4250,
        address: "1001 Potrero Ave Base",
        availability: "AVAILABLE",
        isDemo: true,
      },
      {
        name: "SFPD Metro Police Station (Sector 4)",
        type: "POLICE",
        phone: "+1-415-553-0123",
        latitude: 37.7720,
        longitude: -122.4120,
        address: "850 Bryant St, Justice Center",
        availability: "AVAILABLE",
        isDemo: true,
      },
    ];

    for (const resource of demoResources) {
      await prisma.emergencyResource.create({ data: resource });
    }

    // 6. Seed Primary Emergency Incident
    const primaryIncidentId = "demo-incident-pune-01";
    await prisma.incidentVerification.deleteMany({ where: { incidentId: primaryIncidentId } });
    await prisma.incidentEvidence.deleteMany({ where: { incidentId: primaryIncidentId } });
    await prisma.emergencyIncident.deleteMany({ where: { id: primaryIncidentId } });

    const primaryTimeline = [
      {
        id: "tl-01",
        timestamp: "10:25 AM",
        title: "Accident Reported",
        description: "Road collision detected on Station Road near Sassoon Hospital. SOS alert dispatched.",
        type: "REPORT",
        actorBadge: "SOS Radar",
      },
      {
        id: "tl-02",
        timestamp: "10:26 AM",
        title: "Ambulance Dispatched",
        description: "Ambulance AMB-102 dispatched from Shivaji Nagar Station Depot base.",
        type: "RESPONSE",
        actorBadge: "Unit AMB-102",
      },
      {
        id: "tl-03",
        timestamp: "10:26 AM",
        title: "Police Dispatched",
        description: "Police Patrol Unit POL-021 dispatched from Deccan Gymkhana Sector for perimeter control.",
        type: "RESPONSE",
        actorBadge: "Unit POL-021",
      },
      {
        id: "tl-04",
        timestamp: "10:27 AM",
        title: "Fire Brigade Dispatched",
        description: "Fire Rescue Engine FIRE-014 dispatched from Camp Fire Command station.",
        type: "RESPONSE",
        actorBadge: "Unit FIRE-014",
      },
      {
        id: "tl-05",
        timestamp: "10:28 AM",
        title: "Emergency Corridor Active",
        description: "Green wave automated traffic clearance activated along FC Road & Sancheti Bridge.",
        type: "RESPONSE",
        actorBadge: "Green Wave",
      },
      {
        id: "tl-06",
        timestamp: "10:30 AM",
        title: "Vehicles In Transit",
        description: "Ambulance AMB-102 is 1.8 km from scene (ETA 4 min). Police POL-021 is 2.4 km away.",
        type: "RESPONSE",
        actorBadge: "GPS Radar",
      },
    ];

    await prisma.emergencyIncident.create({
      data: {
        id: primaryIncidentId,
        incidentCode: "RK-1024",
        type: "ROAD_ACCIDENT",
        latitude: 18.5284,
        longitude: 73.8742,
        accuracy: 4.2,
        address: "Station Road, Near Pune Junction / Sassoon General Hospital, Pune",
        detectedAt: new Date(Date.now() - 10 * 60 * 1000),
        description: "Multi-vehicle collision with road obstruction. Emergency response teams dispatched under Green Wave priority.",
        status: "HELP_ARRIVING",
        severity: "CRITICAL",
        aiClassification: "Road Collision & Trauma",
        aiConfidenceScore: 92,
        reportCount: 3,
        photoCount: 1,
        ambulanceNeeded: true,
        policeNeeded: true,
        fireServiceNeeded: true,
        source: "DEMO_SIMULATION",
        confidence: "CONFIRMED",
        timelineEvents: JSON.stringify(primaryTimeline),
      },
    });

    // 7. Seed Emergency Vehicles
    await prisma.vehicleLocationHistory.deleteMany({});
    await prisma.dispatchEvent.deleteMany({});
    await prisma.corridorJunction.deleteMany({});
    await prisma.routeRecommendation.deleteMany({});
    await prisma.emergencyCorridor.deleteMany({});
    await prisma.emergencyVehicle.deleteMany({});

    const now = Date.now();

    const demoVehicles = [
      {
        unitCode: "AMB-102",
        vehicleType: "AMBULANCE",
        status: "EN_ROUTE",
        latitude: 18.5265,
        longitude: 73.8490,
        previousLatitude: 18.5270,
        previousLongitude: 73.8470,
        startLatitude: 18.5310,
        startLongitude: 73.8440,
        startLocationName: "Shivaji Nagar Station Depot",
        currentLocationName: "Shivaji Nagar",
        speed: 42.0,
        heading: 88.0,
        destinationLatitude: 18.5284,
        destinationLongitude: 73.8742,
        destinationName: "Accident Scene - Station Road",
        distanceTravelled: 3.6,
        distanceRemaining: 1.8,
        etaSeconds: 240, // 4 minutes
        expectedArrivalTime: new Date(now + 240 * 1000),
        assignedIncidentId: primaryIncidentId,
        isLive: true,
        isDemo: true,
      },
      {
        unitCode: "POL-021",
        vehicleType: "POLICE",
        status: "EN_ROUTE",
        latitude: 18.5240,
        longitude: 73.8560,
        previousLatitude: 18.5210,
        previousLongitude: 73.8510,
        startLatitude: 18.5170,
        startLongitude: 73.8410,
        startLocationName: "Deccan Gymkhana Station",
        currentLocationName: "Deccan",
        speed: 38.0,
        heading: 35.0,
        destinationLatitude: 18.5284,
        destinationLongitude: 73.8742,
        destinationName: "Accident Scene - Station Road",
        distanceTravelled: 2.1,
        distanceRemaining: 2.4,
        etaSeconds: 360, // 6 minutes
        expectedArrivalTime: new Date(now + 360 * 1000),
        assignedIncidentId: primaryIncidentId,
        isLive: true,
        isDemo: true,
      },
      {
        unitCode: "FIRE-014",
        vehicleType: "FIRE_BRIGADE",
        status: "EN_ROUTE",
        latitude: 18.5400,
        longitude: 73.8300,
        previousLatitude: 18.5350,
        previousLongitude: 73.8350,
        startLatitude: 18.5130,
        startLongitude: 73.8790,
        startLocationName: "Camp Central Fire Command",
        currentLocationName: "Camp",
        speed: 35.0,
        heading: 60.0,
        destinationLatitude: 18.5284,
        destinationLongitude: 73.8742,
        destinationName: "Accident Scene - Station Road",
        distanceTravelled: 4.5,
        distanceRemaining: 3.7,
        etaSeconds: 540, // 9 minutes
        expectedArrivalTime: new Date(now + 540 * 1000),
        assignedIncidentId: primaryIncidentId,
        isLive: true,
        isDemo: true,
      },
      {
        unitCode: "AMB-108",
        vehicleType: "AMBULANCE",
        status: "AVAILABLE",
        latitude: 18.5913,
        longitude: 73.7389,
        startLocationName: "Ruby Hall Hinjawadi Base",
        currentLocationName: "Hinjawadi Phase 1",
        speed: 0.0,
        heading: 0.0,
        destinationLatitude: null,
        destinationLongitude: null,
        destinationName: null,
        distanceTravelled: 0.0,
        distanceRemaining: null,
        etaSeconds: null,
        isLive: true,
        isDemo: true,
      },
      {
        unitCode: "AMB-204",
        vehicleType: "AMBULANCE",
        status: "DISPATCHED",
        latitude: 18.5684,
        longitude: 73.7738,
        startLocationName: "Baner Sector 4 Base",
        currentLocationName: "Balewadi",
        speed: 38.0,
        heading: 45.0,
        destinationLatitude: 18.5802,
        destinationLongitude: 73.8052,
        destinationName: "Aundh District Civil Hospital",
        distanceTravelled: 1.2,
        distanceRemaining: 2.9,
        etaSeconds: 480,
        expectedArrivalTime: new Date(now + 480 * 1000),
        isLive: true,
        isDemo: true,
      },
      {
        unitCode: "POL-112",
        vehicleType: "POLICE",
        status: "DISPATCHED",
        latitude: 18.5350,
        longitude: 73.8420,
        startLocationName: "Shivaji Nagar Metro Division",
        currentLocationName: "Model Colony",
        speed: 45.0,
        heading: 65.0,
        destinationLatitude: 18.5284,
        destinationLongitude: 73.8742,
        destinationName: "Station Road Perimeter Intercept",
        distanceTravelled: 1.5,
        distanceRemaining: 2.4,
        etaSeconds: 360,
        expectedArrivalTime: new Date(now + 360 * 1000),
        isLive: true,
        isDemo: true,
      },
    ];

    const createdVehicles: Record<string, any> = {};
    for (const v of demoVehicles) {
      const created = await prisma.emergencyVehicle.create({ data: v });
      createdVehicles[v.unitCode] = created;
    }

    // Seed location histories for primary units
    const primaryAmbulance = createdVehicles["AMB-102"];
    const policeUnit = createdVehicles["POL-021"];
    const fireUnit = createdVehicles["FIRE-014"];

    if (primaryAmbulance) {
      const ambHistories = [
        { latitude: 18.5310, longitude: 73.8440, speed: 0.0, heading: 0.0, locationName: "Shivaji Nagar Depot", distanceTravelled: 0.0, timestamp: new Date(now - 8 * 60 * 1000) },
        { latitude: 18.5290, longitude: 73.8460, speed: 38.0, heading: 85.0, locationName: "FC Road Junction", distanceTravelled: 1.2, timestamp: new Date(now - 5 * 60 * 1000) },
        { latitude: 18.5275, longitude: 73.8475, speed: 44.0, heading: 88.0, locationName: "Shimla Office Chowk", distanceTravelled: 2.4, timestamp: new Date(now - 3 * 60 * 1000) },
        { latitude: 18.5265, longitude: 73.8490, speed: 42.0, heading: 88.0, locationName: "Shivaji Nagar", distanceTravelled: 3.6, timestamp: new Date(now - 30 * 1000) },
      ];
      for (const h of ambHistories) {
        await prisma.vehicleLocationHistory.create({
          data: { vehicleId: primaryAmbulance.id, ...h },
        });
      }
    }

    if (policeUnit) {
      const polHistories = [
        { latitude: 18.5170, longitude: 73.8410, speed: 0.0, heading: 0.0, locationName: "Deccan Gymkhana", distanceTravelled: 0.0, timestamp: new Date(now - 8 * 60 * 1000) },
        { latitude: 18.5200, longitude: 73.8480, speed: 35.0, heading: 40.0, locationName: "JM Road Crossing", distanceTravelled: 1.1, timestamp: new Date(now - 4 * 60 * 1000) },
        { latitude: 18.5240, longitude: 73.8560, speed: 38.0, heading: 35.0, locationName: "Deccan", distanceTravelled: 2.1, timestamp: new Date(now - 30 * 1000) },
      ];
      for (const h of polHistories) {
        await prisma.vehicleLocationHistory.create({
          data: { vehicleId: policeUnit.id, ...h },
        });
      }
    }

    if (fireUnit) {
      const fireHistories = [
        { latitude: 18.5130, longitude: 73.8790, speed: 0.0, heading: 0.0, locationName: "Camp Fire Station", distanceTravelled: 0.0, timestamp: new Date(now - 8 * 60 * 1000) },
        { latitude: 18.5280, longitude: 73.8550, speed: 32.0, heading: 55.0, locationName: "M.G. Road Corridor", distanceTravelled: 2.8, timestamp: new Date(now - 4 * 60 * 1000) },
        { latitude: 18.5400, longitude: 73.8300, speed: 35.0, heading: 60.0, locationName: "Camp", distanceTravelled: 4.5, timestamp: new Date(now - 30 * 1000) },
      ];
      for (const h of fireHistories) {
        await prisma.vehicleLocationHistory.create({
          data: { vehicleId: fireUnit.id, ...h },
        });
      }
    }

    // 7. Seed Emergency Corridor & Junctions
    const corridorWaypoints = [
      [18.5265, 73.8490], // Ambulance current
      [18.5300, 73.8450], // Junction 1
      [18.5290, 73.8560], // Junction 2
      [18.5285, 73.8700], // Junction 3
      [18.5284, 73.8742], // Sassoon Hospital
    ];

    const corridor = await prisma.emergencyCorridor.create({
      data: {
        corridorCode: "COR-PUNE-01",
        name: "FC Road to Sassoon General Hospital Emergency Corridor",
        vehicleId: primaryAmbulance ? primaryAmbulance.id : null,
        status: "ACTIVE",
        priority: "CRITICAL",
        originName: "Shivajinagar Base / FC Road",
        originLat: 18.5265,
        originLng: 73.8490,
        destinationName: "Sassoon General Hospital",
        destinationLat: 18.5284,
        destinationLng: 73.8742,
        totalDistanceKm: 1.8,
        estimatedEtaMinutes: 4,
        activeJunctionCount: 3,
        trafficCondition: "MODERATE",
        waypointsJson: JSON.stringify(corridorWaypoints),
        isDemo: true,
      },
    });

    // Seed Junctions
    const junctionsData = [
      {
        corridorId: corridor.id,
        name: "Junction 1 - Shimla Office Chowk",
        sequence: 1,
        latitude: 18.5300,
        longitude: 73.8450,
        trafficStatus: "CLEAR",
        corridorStatus: "ACTIVE",
        greenWaveActive: true,
        clearanceDistanceMeters: 300,
        isDemo: true,
      },
      {
        corridorId: corridor.id,
        name: "Junction 2 - Sancheti Hospital Bridge",
        sequence: 2,
        latitude: 18.5290,
        longitude: 73.8560,
        trafficStatus: "HEAVY",
        corridorStatus: "REDIRECTED",
        greenWaveActive: true,
        clearanceDistanceMeters: 450,
        isDemo: true,
      },
      {
        corridorId: corridor.id,
        name: "Junction 3 - Pune Station Chowk",
        sequence: 3,
        latitude: 18.5285,
        longitude: 73.8700,
        trafficStatus: "CLEAR",
        corridorStatus: "ACTIVE",
        greenWaveActive: true,
        clearanceDistanceMeters: 350,
        isDemo: true,
      },
    ];

    for (const j of junctionsData) {
      await prisma.corridorJunction.create({ data: j });
    }

    // Seed AI Route Recommendation
    await prisma.routeRecommendation.create({
      data: {
        corridorId: corridor.id,
        vehicleId: primaryAmbulance ? primaryAmbulance.id : null,
        recommendedRouteName: "Route A - Smart Corridor",
        recommendedEtaMinutes: 4,
        recommendedDistanceKm: 1.8,
        alternativeRouteName: "Route B - Arterial Bypass",
        alternativeEtaMinutes: 7,
        alternativeDistanceKm: 2.6,
        reason: "Route A has lower estimated congestion and automated junction clearance priority.",
        aiPriority: "CRITICAL",
        confidence: 94,
      },
    });

    // Seed Dispatch Events
    const dispatchEventsData = [
      {
        vehicleId: primaryAmbulance ? primaryAmbulance.id : null,
        eventType: "INCIDENT_REPORTED",
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        latitude: 18.5284,
        longitude: 73.8742,
        description: "🚨 Road Accident Reported via RakshAI SOS & Community Radar (Station Road)",
      },
      {
        vehicleId: primaryAmbulance ? primaryAmbulance.id : null,
        eventType: "DISPATCHED",
        timestamp: new Date(Date.now() - 8 * 60 * 1000),
        latitude: 18.5265,
        longitude: 73.8490,
        description: "🚑 Ambulance AMB-102 Dispatched from Shivajinagar Base (ETA ~6 min)",
      },
      {
        vehicleId: policeUnit ? policeUnit.id : null,
        eventType: "DISPATCHED",
        timestamp: new Date(Date.now() - 8 * 60 * 1000),
        latitude: 18.5240,
        longitude: 73.8560,
        description: "👮 Police Vehicle POL-021 Dispatched for Perimeter Control (ETA ~4 min)",
      },
      {
        vehicleId: primaryAmbulance ? primaryAmbulance.id : null,
        eventType: "EN_ROUTE",
        timestamp: new Date(Date.now() - 6 * 60 * 1000),
        latitude: 18.5270,
        longitude: 73.8520,
        description: "🚑 Ambulance AMB-102 En Route — Emergency Corridor Active",
      },
      {
        vehicleId: policeUnit ? policeUnit.id : null,
        eventType: "EN_ROUTE",
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        latitude: 18.5245,
        longitude: 73.8590,
        description: "👮 Police Vehicle POL-021 En Route to Incident Location",
      },
      {
        vehicleId: primaryAmbulance ? primaryAmbulance.id : null,
        eventType: "DISTANCE_UPDATE",
        timestamp: new Date(Date.now() - 3 * 60 * 1000),
        latitude: 18.5278,
        longitude: 73.8600,
        description: "📍 AMB-102: 2.4 km Remaining — Junction 1 Cleared",
      },
      {
        vehicleId: fireUnit ? fireUnit.id : null,
        eventType: "DISPATCHED",
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        latitude: 18.5400,
        longitude: 73.8300,
        description: "🚒 Fire Brigade FIRE-014 Dispatched to Fire Scene (ETA ~9 min)",
      },
    ];

    for (const ev of dispatchEventsData) {
      await prisma.dispatchEvent.create({ data: ev });
    }

    console.log("RakshAI emergency database seeding completed successfully with Emergency Corridor & Vehicles.");
  } catch (err) {
    console.error("Error during in-process database seed:", err);
  }
}
