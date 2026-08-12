# NooL-Vazhi 🚛

### AI-Powered Smart Truck Pooling & Logistics Management Platform

> **Making Every Kilometer Count.**

NooL-Vazhi is an intelligent logistics platform designed to connect **Drivers, Organizations, Transport Offices, and Mechanics** through a single digital ecosystem.

It addresses major logistics challenges such as **empty return trips, inefficient truck utilization, delayed payments, manual driver coordination, shipment visibility, and difficulty finding nearby mechanics during truck breakdowns.**

---

## 🚀 Key Features

- 🚛 **Smart Truck Pooling**
- 🤖 **AI Driver Recommendation**
- 📦 **Return Load Matching**
- 🏢 **Organization Shipment Management**
- 🔨 **Driver Auction & Bidding**
- 📍 **Real-Time GPS Tracking**
- ⏱️ **ETA Prediction**
- 🛣️ **Route Recommendation**
- 📄 **Document Verification**
- 💳 **10% Advance + 90% Final Payment**
- 🔧 **Nearby Mechanic Assistance**
- 🏭 **Transport Office Management**
- 📊 **Role-Based Analytics**
- 🔔 **Real-Time Notifications**

---

## 🎯 Problem Statement

Traditional logistics operations face several challenges:

- Drivers often return without loads after completing deliveries.
- Small organizations may pay for the full truck even when their load uses only part of the capacity.
- Transport offices depend heavily on manual coordination for driver and shipment allocation.
- Drivers face difficulty finding reliable mechanics during unexpected breakdowns.
- Parcel-based payment processes can delay receiving the full transportation amount.
- Customers and organizations have limited real-time visibility of shipments.

NooL-Vazhi brings these processes into one intelligent platform.

---

## 💡 Our Solution

NooL-Vazhi connects four major stakeholders:

| User | Solution |
|------|----------|
| 🚛 Driver | Trips, return loads, auctions, payments, GPS tracking and mechanic assistance |
| 🏢 Organization | Shipment creation, truck pooling, driver selection, auctions and payments |
| 🏭 Transport Office | Driver assignment, shipment management and return-load matching |
| 🔧 Mechanic | Nearby breakdown requests and repair management |

---

## 🔄 Core Workflow

```text
Organization Creates Shipment
            ↓
      Truck Pooling
            ↓
    AI Driver Recommendation
            ↓
     Driver Selection / Auction
            ↓
       Driver Acceptance
            ↓
       10% Advance Payment
            ↓
        GPS Live Tracking
            ↓
          Delivery
            ↓
       90% Final Payment
            ↓
      Return Load Matching
🤖 AI Features
1. Driver Recommendation

AI recommends suitable drivers using:

Driver rating
Experience
Availability
Truck capacity
Distance
Previous performance
Completion rate
Route compatibility
2. Shipper / Return Load Recommendation

Matches drivers with suitable return shipments based on:

Current location
Destination
Truck capacity
Load weight
Route compatibility
Expected earnings
3. ETA Prediction

Predicts estimated arrival time using:

Distance
Current location
Average speed
Historical travel time
Route conditions
4. Route Recommendation

Suggests suitable routes based on:

Distance
Travel time
Fuel consumption
Traffic
Toll cost
5. Document Verification

Supports verification of:

Driving License
RC
Insurance
Pollution Certificate
Permit
🧠 AI Architecture

The project uses two primary machine learning algorithms:

Random Forest
XGBoost
Logistics Dataset
       ↓
Data Collection
       ↓
Data Preprocessing
       ↓
Feature Engineering
       ↓
Feature Selection
       ↓
Train-Test Split
       ↓
Random Forest + XGBoost
       ↓
AI Ensemble Model
       ↓
AI Logistics Intelligence Engine
       ↓
Recommendations & Predictions

Document verification is handled separately through an OCR/document verification pipeline and is not falsely treated as a Random Forest/XGBoost task.

📦 Smart Truck Pooling

Truck pooling allows compatible shipments to share available truck capacity.

Example
Truck Capacity       : 2000 kg

Organization A       : 800 kg
Organization B       : 900 kg
                       -------
Total Load           : 1700 kg

Unused Capacity      : 300 kg

This improves truck utilization and reduces transportation costs.

🔄 Return Load Matching

After completing a shipment, the platform searches for suitable nearby loads.

Delivery Completed
        ↓
Current Driver Location
        ↓
Search Nearby Loads
        ↓
Capacity Validation
        ↓
Route Compatibility
        ↓
AI Match Score
        ↓
Recommended Return Load

This helps reduce empty return trips and increases driver earning opportunities.

💳 Smart Payment System

The payment system follows milestone-based rules.

Advance Payment

The 10% advance is enabled only when:

Organization Selects Driver
          +
Driver Accepts Shipment
          ↓
    10% Advance Payment

Example:

Shipment Amount : ₹25,000
Advance 10%     : ₹2,500
Remaining 90%   : ₹22,500
Final Payment

The remaining 90% becomes available only after successful delivery.

Shipment Delivered
        ↓
90% Final Payment
        ↓
Digital Receipt
📍 GPS Tracking

The tracking system provides:

Current truck location
Pickup location
Destination
Route
ETA
Distance remaining
Shipment timeline
Shipment Status
Accepted
   ↓
Pickup Started
   ↓
In Transit
   ↓
Near Destination
   ↓
Delivered

All tracking components use:

shipment.currentStatus

as the single source of truth.

🧪 GPS Simulation Mode

Simulation Mode is provided for:

Demonstrations
Testing
Presentations
Start Journey
     ↓
0 sec  → Pickup Started
     ↓
10 sec → In Transit
     ↓
20 sec → Near Destination
     ↓
30 sec → Delivered

The truck marker moves automatically during simulation.

🔧 Emergency Mechanic Assistance

When a driver faces a breakdown:

Truck Breakdown
       ↓
Warranty Check
       ↓
   ┌───┴────┐
   ↓        ↓
Warranty   No Warranty
   ↓        ↓
Authorized  Nearby
Service     Mechanics
Center
Under Warranty

The system shows nearby authorized manufacturer service centers.

Out of Warranty

The system searches for nearby mechanics based on:

Distance
Rating
Availability
Service type
Mechanic Workflow
Service Request
       ↓
Mechanic Accepts
       ↓
On The Way
       ↓
Arrived
       ↓
Repair Started
       ↓
Repair Completed
🔨 Auction System

Organizations can create shipment auctions.

Drivers can submit bids based on shipment requirements.

Capacity validation is enforced.

Required Load: 1000 kg

Driver Capacity: 1500 kg
        ↓
      Eligible

Driver Capacity: 700 kg
        ↓
    Not Eligible

After selecting the winning driver:

Winner Selected
      ↓
Driver Accepts
      ↓
10% Advance Enabled
🏭 Transport Office

Transport offices can:

Assign drivers
Manage shipments
Track trucks
Manage drivers
Find return loads
View payments
Monitor operations
View analytics
Office Return Load Matching
Delivery Completed
        ↓
Search Nearby Offices
        ↓
Find Available Return Load
        ↓
Check Capacity
        ↓
Check Route
        ↓
Assign Return Load
⛽ Fuel & FASTag

Drivers can record:

Fuel expenses
Fuel quantity
Fuel station
FASTag expenses
Trip expenses

Analytics include:

Fuel cost per trip
Fuel cost per kilometer
FASTag cost
Total trip cost
📊 Analytics
Driver
Total Trips
Completed Trips
Earnings
Return Loads
Empty Trips Avoided
Fuel Expenses
Organization
Total Shipments
Transportation Cost
Cost Saved
Delivery Performance
Transport Office
Driver Utilization
Shipment Count
Return Load Matches
Operational Performance
Mechanic
Service Requests
Completed Repairs
Response Time
Earnings
🏗️ Technology Stack
Frontend
Next.js
React
HTML5
CSS3
Backend
Node.js
Express.js
REST APIs
Database
MongoDB Atlas
AI / Machine Learning
Python
Pandas
NumPy
Scikit-learn
XGBoost
Joblib
Google Colab
Maps & Tracking
Leaflet
React Leaflet
Geolocation API
Real-Time Communication
Socket.IO
Payments
Razorpay
🏛️ System Architecture
                 NOOL-VAZHI
                      │
       ┌──────────────┼──────────────┐
       │              │              │
     Driver      Organization   Transport Office
       │              │              │
       └──────────────┼──────────────┘
                      │
                   Mechanic
                      │
                      ▼
                Next.js Frontend
                      │
                      ▼
              Node.js + Express
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
     MongoDB       AI Engine   Socket.IO
      Atlas
          │           │           │
          └───────────┼───────────┘
                      ▼
              External Services
          GPS / Maps / Razorpay
📱 Mobile Application

The platform can be extended into a mobile application while keeping the existing backend and database.

React Native Mobile App
          ↓
Node.js + Express APIs
          ↓
MongoDB Atlas
          ↓
AI Services

The mobile application provides role-based experiences for:

Driver
Organization
Transport Office
Mechanic
🔐 Business Rules
1. Driver must have sufficient truck capacity.

2. Driver cannot bid on unsuitable shipments.

3. 10% advance is enabled only after
   driver selection + driver acceptance.

4. 90% final payment is enabled only
   after shipment delivery.

5. Warranty breakdowns → Authorized service center.

6. Non-warranty breakdowns → Nearby mechanics.

7. Return loads must be route compatible.

8. GPS timeline and shipment status
   must remain synchronized.

9. Simulation mode is only for demo/testing.

10. Duplicate notifications must be prevented.
🧪 Testing
Normal Shipment
Create Shipment
      ↓
Truck Pooling Check
      ↓
AI Driver Recommendation
      ↓
Select Driver
      ↓
Driver Accepts
      ↓
10% Payment
      ↓
Start Journey
      ↓
GPS Tracking
      ↓
Delivery
      ↓
90% Payment
Auction
Create Auction
      ↓
Driver Bids
      ↓
Capacity Validation
      ↓
Select Winner
      ↓
Driver Accepts
      ↓
10% Payment
      ↓
GPS Tracking
      ↓
Delivery
      ↓
90% Payment
Return Load
Delivery
   ↓
Find Return Load
   ↓
AI Recommendation
   ↓
Accept Return Load
Breakdown
Truck Problem
      ↓
Warranty Check
      ↓
Authorized Service
      OR
Nearby Mechanic
      ↓
Service Request
      ↓
Repair
      ↓
Completion
📁 Project Structure
Nool-Vazhi/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── pages/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── services/
│   ├── ai/
│   └── package.json
│
└── README.md
⚙️ Installation
Clone Repository
git clone <your-repository-url>

cd Nool-Vazhi
Frontend
cd frontend
npm install
npm run dev
Backend
cd backend
npm install
npm start
🔑 Environment Variables

Create a .env file in the backend:

PORT=5000

MONGODB_URI=your_mongodb_atlas_connection_string

JWT_SECRET=your_jwt_secret

RAZORPAY_KEY_ID=your_razorpay_key

RAZORPAY_KEY_SECRET=your_razorpay_secret

Never commit .env files or API credentials to GitHub.

📈 Expected Impact

NooL-Vazhi aims to:

Reduce empty truck journeys
Improve truck utilization
Increase driver earning opportunities
Reduce transportation costs
Improve shipment visibility
Enable faster payment settlement
Reduce manual logistics coordination
Provide faster breakdown assistance
Enable data-driven logistics decisions
🔮 Future Scope
Advanced real-time route optimization
Predictive vehicle maintenance
FASTag integration
Fuel management
SOS emergency services
Insurance integration
Carbon emission monitoring
Demand forecasting
National-scale logistics expansion
🌱 Vision

No Empty Trips.

No Unused Capacity.

No Unnecessary Delays.

NooL-Vazhi

Making Every Kilometer Count. 🚛
