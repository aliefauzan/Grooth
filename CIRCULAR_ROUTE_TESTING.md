# 🔄 Circular Route Testing Guide

## How to Test Circular Routes in Grooth

### Prerequisites
- ✅ Backend server running on http://localhost:5000
- ✅ Frontend server running on http://localhost:3000
- ✅ Google Maps API key configured in backend/.env

### Testing Steps

## 1. **Basic Circular Route Test**

### Step 1: Open the Application
- Navigate to http://localhost:3000
- You should see the Grooth interface with a map

### Step 2: Set Up Circular Route
- **Origin**: Enter the same location in both "Origin" and "Destination" fields
- **Example**: Use `Jakarta, Indonesia` in both fields
- **Alternative**: Use coordinates like `-6.2088,106.8456` in both fields

### Step 3: Observe UI Changes
- ✅ Purple "Circular Route Options" panel should appear automatically
- ✅ Submit button should change to "Find Circular Route"
- ✅ Additional controls should be visible:
  - Duration input (minutes)
  - Distance input (km)
  - Route Type dropdown

## 2. **Test Different Circular Route Types**

### A. **Duration-Based Route**
```
Origin: Jakarta, Indonesia
Destination: Jakarta, Indonesia
Duration: 30 (minutes)
Route Type: Duration-based
```

### B. **Distance-Based Route**
```
Origin: Jakarta, Indonesia
Destination: Jakarta, Indonesia
Distance: 5.0 (km)
Route Type: Distance-based
```

### C. **Scenic Route**
```
Origin: Jakarta, Indonesia
Destination: Jakarta, Indonesia
Duration: 45
Route Type: Scenic Route
```

### D. **Fitness Route**
```
Origin: Jakarta, Indonesia
Destination: Jakarta, Indonesia
Duration: 60
Route Type: Fitness Route
```

### E. **Balanced Route**
```
Origin: Jakarta, Indonesia
Destination: Jakarta, Indonesia
Distance: 8.0
Route Type: Balanced Route
```

## 3. **Expected Results**

### Frontend UI Validation
- ✅ Circular route options panel appears when origin = destination
- ✅ Button text changes to "Find Circular Route"
- ✅ Results show "🔄 Circular Route Results" header
- ✅ Route cards show "Round Trip" information
- ✅ Route cards show route type and parameters used

### Backend API Response
The API should return routes with:
```json
{
  "best": {
    "from": "Jakarta, Indonesia",
    "to": "Jakarta, Indonesia",
    "steps": [...], // Array of waypoints forming a circle
    "totalDistance": "5.2 km",
    "totalDuration": "32 minutes",
    "pollutionScore": "Good",
    "avgAqi": 45
  },
  "alternative": {...},
  "worst": {...}
}
```

## 4. **Direct API Testing**

### Test Circular Route API Directly
```bash
# Duration-based circular route
curl "http://localhost:5000/api/route?from=Jakarta,Indonesia&to=Jakarta,Indonesia&type=circular&duration=30&routeType=duration"

# Distance-based circular route
curl "http://localhost:5000/api/route?from=-6.2088,106.8456&to=-6.2088,106.8456&type=circular&distance=5&routeType=distance"

# Scenic circular route
curl "http://localhost:5000/api/route?from=Jakarta,Indonesia&to=Jakarta,Indonesia&type=circular&duration=45&routeType=scenic"
```

## 5. **Troubleshooting**

### Common Issues:

#### UI Not Showing Circular Options
- ✅ Check that origin and destination are exactly the same
- ✅ Clear and re-enter the same location in both fields

#### API Errors
- ✅ Check backend console for errors
- ✅ Verify Google Maps API key is valid
- ✅ Check if API quotas are exceeded

#### No Routes Returned
- ✅ Try different locations (some areas might have limited data)
- ✅ Use major cities like Jakarta, Bangkok, Manila for testing
- ✅ Check distance/duration parameters are reasonable

### Debug Backend
```bash
# Check backend logs
tail -f backend/server.log

# Test if backend is responding
curl http://localhost:5000/health
```

## 6. **Visual Verification**

### Map Display Should Show:
- 🗺️ Interactive Google Map
- 📍 Single marker at origin/destination
- 🛣️ Polyline showing the circular route path
- 🌡️ Heatmap overlay showing air quality along route
- 🎨 Color-coded routes (best=green, alternative=yellow, worst=red)

### Route Cards Should Display:
- 🥇 Best/🥈 Alternative/🥉 Worst circular route labels
- 🔄 "Round Trip" information instead of separate from/to
- ⏱️ Duration and distance information
- 🌬️ Air quality score
- 📊 Individual maps for each route option

## 7. **Test Data Suggestions**

### Good Test Locations:
```
Jakarta, Indonesia (-6.2088, 106.8456)
Bangkok, Thailand (13.7563, 100.5018)
Manila, Philippines (14.5995, 120.9842)
Singapore (1.3521, 103.8198)
Kuala Lumpur, Malaysia (3.1390, 101.6869)
```

### Test Parameters:
```
Duration: 10, 20, 30, 45, 60, 90 minutes
Distance: 1, 2.5, 5, 8, 10, 15 km
Route Types: balanced, scenic, fitness, duration, distance
```

## 8. **Success Criteria**

✅ **Frontend**
- Circular route UI appears automatically
- All controls work properly
- Results display correctly
- Maps show circular paths

✅ **Backend**
- API accepts circular route parameters
- Returns valid circular route data
- Includes proper waypoints
- Air quality data included

✅ **Integration**
- End-to-end flow works smoothly
- No console errors
- Performance is acceptable
- User experience is intuitive

---

## Quick Test Checklist

- [ ] Open http://localhost:3000
- [ ] Enter same location in origin and destination
- [ ] Verify circular route panel appears
- [ ] Set duration to 30 minutes
- [ ] Select "Scenic Route" type
- [ ] Click "Find Circular Route"
- [ ] Verify results show circular route information
- [ ] Check map displays circular path
- [ ] Test different route types
- [ ] Verify air quality data is included

**Happy Testing! 🚴‍♂️🌿**
