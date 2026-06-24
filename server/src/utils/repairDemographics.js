const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const prisma = require('../lib/prisma');

const parseAddress = (addressStr) => {
  const result = {
    district: '',
    state: '',
    pincode: '',
    village: '',
    country: 'India'
  };

  if (!addressStr || typeof addressStr !== 'string') return result;

  // Try extracting 6-digit pincode
  const pinMatch = addressStr.match(/\b\d{6}\b/);
  if (pinMatch) {
    result.pincode = pinMatch[0];
  }

  // Split by comma
  const parts = addressStr.split(',').map(p => p.trim()).filter(Boolean);
  
  if (parts.length > 0) {
    // Last element might be Country (like India)
    if (parts[parts.length - 1].toLowerCase() === 'india') {
      result.country = parts[parts.length - 1];
      parts.pop();
    }
    
    // Check if new last element is pincode
    if (parts.length > 0 && /^\d{6}$/.test(parts[parts.length - 1])) {
      result.pincode = parts[parts.length - 1];
      parts.pop();
    }

    // New last element is likely State
    if (parts.length > 0) {
      result.state = parts[parts.length - 1];
      parts.pop();
    }

    // Preceding element is likely District
    if (parts.length > 0) {
      result.district = parts[parts.length - 1];
      parts.pop();
    }

    // Remaining elements joined are likely Village / Locality
    if (parts.length > 0) {
      result.village = parts.join(', ');
    }
  }

  return result;
};

async function repair() {
  console.log("=== STARTING AADHAAR DEMOGRAPHICS RECOVERY & DATA REPAIR UTILITY ===");
  
  const baseUrl = process.env.APP_BASE_URL || 'https://auth.dizipay.in';
  console.log(`Using Base URL: ${baseUrl}`);

  try {
    const users = await prisma.user.findMany({
      where: {
        aadhaarVerified: true
      }
    });

    console.log(`Found ${users.length} verified users to check and repair.`);

    let successCount = 0;
    let unchangedCount = 0;

    for (const user of users) {
      console.log(`\nChecking User ID: ${user.id} (${user.name || user.email})`);

      const updateData = {};

      // 1. Normalize Aadhaar photo URL to absolute
      if (user.aadhaarPhotoUrl) {
        if (!user.aadhaarPhotoUrl.startsWith('http')) {
          const pathPart = user.aadhaarPhotoUrl.startsWith('/') ? user.aadhaarPhotoUrl : `/${user.aadhaarPhotoUrl}`;
          const normalizedUrl = `${baseUrl}${pathPart}`;
          updateData.aadhaarPhotoUrl = normalizedUrl;
          console.log(`[+] Normalizing photo URL: ${user.aadhaarPhotoUrl} -> ${normalizedUrl}`);
        }
      }

      // 2. Parse address if demographics are missing
      const isDemographicsMissing = 
        !user.aadhaarDistrict || 
        !user.aadhaarState || 
        !user.aadhaarPincode || 
        !user.aadhaarCountry;

      if (isDemographicsMissing && user.aadhaarAddress) {
        console.log(`[+] Demographics missing. Parsing address: "${user.aadhaarAddress}"`);
        const parsed = parseAddress(user.aadhaarAddress);

        if (parsed.district && !user.aadhaarDistrict) {
          updateData.aadhaarDistrict = parsed.district;
        }
        if (parsed.state && !user.aadhaarState) {
          updateData.aadhaarState = parsed.state;
        }
        if (parsed.pincode && !user.aadhaarPincode) {
          updateData.aadhaarPincode = parsed.pincode;
        }
        if (parsed.village && !user.aadhaarVillage) {
          updateData.aadhaarVillage = parsed.village;
        }
        if (parsed.country && (!user.aadhaarCountry || user.aadhaarCountry === '')) {
          updateData.aadhaarCountry = parsed.country;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });
        console.log(`[✓] Repaired User ${user.id}:`, JSON.stringify(updateData, null, 2));
        successCount++;
      } else {
        console.log(`[~] User ${user.id} is already in a healthy state.`);
        unchangedCount++;
      }
    }

    console.log("\n=== REPAIR WORK COMPLETE ===");
    console.log(`Total Repaired: ${successCount}`);
    console.log(`Total Healthy: ${unchangedCount}`);
  } catch (error) {
    console.error("FATAL: Repair utility encountered a top-level crash:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  repair();
}

module.exports = repair;
