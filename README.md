# HawkerHub - Hawker Centre Management System

A comprehensive web-based platform for managing hawker centre operations, connecting patrons with hawker stalls, and streamlining administrative tasks for operators and NEA officers.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [User Roles](#user-roles)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Page Guide](#page-guide)
- [Image Credits](#image-credits)
- [License](#license)

---

## Overview

HawkerHub is a modern web application designed to digitize and enhance the hawker centre experience in Singapore. The platform facilitates seamless interactions between patrons, hawker vendors, hawker centre operators, and NEA (National Environment Agency) officers through a unified, user-friendly interface.

**Key Highlights:**
- Browse and order from hawker stalls online
- Real-time order management for vendors
- Hygiene inspection tracking for NEA officers
- Comprehensive analytics for operators
- Multi-role authentication system

---

## Features

### For Patrons (Customers)
- 🔍 **Browse Stalls** - Search and filter stalls by cuisine type, dietary requirements (Halal, Vegetarian)
- 🛒 **Online Ordering** - Add items to cart, customize orders, and checkout
- ❤️ **Favorites** - Save liked stalls and dishes for quick access
- 📜 **Order History** - View past orders and reorder with ease
- ⭐ **Reviews & Feedback** - Rate stalls and leave feedback
- 👤 **Profile Management** - Manage personal details and preferences

### For Vendors (Stall Owners)
- 📋 **Menu Management** - Add, edit, and remove menu items
- 📦 **Order Management** - View and update order status in real-time
- 📊 **Analytics Dashboard** - Track revenue, popular items, and customer trends
- 📝 **Complaint Handling** - View and respond to customer complaints
- 🏪 **Stall Profile** - Manage stall information, images, and hygiene grades
- 📄 **Lease Management** - Track license status and renewal applications

### For Operators
- 📈 **Centre Overview** - Monitor total revenue, occupied stalls, and traffic
- 🏗️ **Stall Management** - View and manage registered vendors
- 📉 **Revenue Analytics** - Track centre-wide revenue trends
- ⭐ **Performance Metrics** - View top-performing stalls

### For NEA Officers
- 🔍 **Inspection Scheduling** - Schedule and manage hygiene inspections
- 📋 **Stall Directory** - Access complete list of registered stalls
- 📝 **Inspection Reports** - Submit hygiene scores and observations
- ⚠️ **Violation Tracking** - Monitor stalls with critical violations
- 📊 **Dashboard Analytics** - View hygiene standards across the centre

---

## User Roles

| Role | Description | Entry Points |
|------|-------------|--------------|
| **Guest** | Unauthenticated users browsing the platform | `index.html` |
| **Patron** | Registered customers who can order food | `SigninPatron.html` → `CreateAccountPatron.html` |
| **Vendor** | Hawker stall owners managing their business | `SigninVendor.html` → `CreateAccountVendor.html` |
| **Operator** | Hawker centre management staff | `SigninOperator.html` |
| **NEA Officer** | Health inspection officers | `SigninOfficer.html` |

---

## Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom styling with responsive design
- **JavaScript (ES6+)** - Interactive functionality
- **Chart.js** - Data visualization for analytics

### Backend & Services
- **Firebase Authentication** - User authentication and session management
- **Cloud Firestore** - NoSQL database for real-time data
- **Firebase Storage** - Image storage for stalls and menus

### External Libraries
- **Font Awesome 6.4.0** - Icon library
- **Google Fonts (Inter)** - Typography

---

## Project Structure

```
FED_GROUP-ASSIGNMENT/
├── img/                          # Image assets (food, icons, backgrounds)
│   ├── avatars/                  # User avatar images
│   └── [food-images].jpg         # Food and stall photos
│
├── HTML Pages/
│   ├── index.html            # Landing page for guests
│   ├── signup.html               # Sign-up selection page
│   ├── signupOfficeroperator.html # Officer/Operator sign-up
│   │
│   ├── Patron Pages/
│   │   ├── SigninPatron.html     # Patron login
│   │   ├── CreateAccountPatron.html # Patron registration
│   │   ├── browsestalls.html     # Browse all stalls
│   │   ├── stalldetails.html     # Individual stall view
│   │   ├── menus.html            # Menu browsing
│   │   ├── cart.html             # Shopping cart
│   │   ├── checkout.html         # Checkout process
│   │   ├── PaymentSuccesss.html  # Payment confirmation
│   │   ├── history.html          # Order history
│   │   ├── Likes.html            # Saved/favorite stalls
│   │   ├── PatronProfile.html    # User profile
│   │   ├── feedback.html         # Submit feedback
│   │   └── complaint.html        # Submit complaints
│   │
│   ├── Vendor Pages/
│   │   ├── SigninVendor.html     # Vendor login
│   │   ├── CreateAccountVendor.html # Vendor registration
│   │   ├── VenderAccount.html    # Vendor dashboard
│   │   ├── VendorOrder.html      # Order management
│   │   ├── VendorStallDetails.html # Stall profile management
│   │   ├── VendorComplaints.html # View complaints
│   │   ├── VendorLikes.html      # View customer likes
│   │   ├── VendorLeaseLicense.html # License management
│   │   ├── VendorLeaseRenewal.html # Lease renewal application
│   │   └── VenderAccountRentalStatus.html # Rental status
│   │
│   ├── Operator Pages/
│   │   ├── SigninOperator.html   # Operator login
│   │   └── operator.html         # Operator dashboard
│   │
│   ├── NEA Officer Pages/
│   │   ├── SigninOfficer.html    # Officer login
│   │   ├── NEAofficer.html       # Officer dashboard
│   │   └── inspection.html       # Inspection interface
│   │
│   └── Admin Pages/
│       ├── AdminDeleteAccount.html     # Account deletion
│       └── AdminDeleteGoogle.html      # Google account deletion
│
├── JavaScript Files/
│   ├── firebase-init.js          # Firebase configuration
│   ├── navbar-*.js               # Navigation bar components
│   ├── *-auth.js                 # Authentication handlers
│   ├── home-guest.js             # Guest page functionality
│   ├── browsestalls.js           # Stall browsing logic
│   ├── ScriptCart.js             # Shopping cart logic
│   ├── checkout.js               # Checkout process
│   ├── menu.js                   # Menu display logic
│   ├── history.js                # Order history
│   ├── Likes.js                  # Favorites management
│   ├── VendorAccount.js          # Vendor dashboard
│   ├── VendorOrder.js            # Vendor order management
│   ├── VendorComplaints.js       # Complaint handling
│   ├── VendorStallDetails.js     # Stall details management
│   ├── operator.js               # Operator dashboard
│   ├── NEAofficer.js             # Officer dashboard
│   └── [other JS files]
│
├── CSS Files/
│   ├── styles.css                # Main styles
│   ├── topnav.css                # Navigation styles
│   ├── SignInStyle.css           # Sign-in page styles
│   ├── SignUpStyle.css           # Sign-up page styles
│   ├── CreateAccVendorPatronStyle.css # Registration styles
│   ├── browsestalls.css          # Stall browsing styles
│   ├── StylesCart.css            # Cart styles
│   ├── StylesCheckOut.css        # Checkout styles
│   ├── Menu.css                  # Menu styles
│   ├── Profile.css               # Profile styles
│   ├── VendorAccount.css         # Vendor dashboard styles
│   ├── operatorandofficer.css    # Operator/Officer styles
│   ├── VendorDetails.css         # Vendor details styles
│   ├── VendorComplaints.css      # Complaints styles
│   ├── VendorLeaseRenewal.css    # Lease renewal styles
│   ├── VendorOrder.css           # Order styles
│   ├── VendorStallDetails.css    # Stall details styles
│   ├── complaint.css             # Complaint form styles
│   ├── analytics.css             # Analytics styles
│   ├── Review.css                # Review styles
│   ├── cardmodal.css             # Modal styles
│   ├── Forms.css                 # Form styles
│   ├── SubmitComplaint.css       # Complaint submission styles
│   ├── SubmitFeedback.css        # Feedback styles
│   ├── PaymentSuccessStyles.css  # Payment success styles
│   └── StylesHistory.css         # History styles
│
└── Documentation/
    ├── README.md                 # This file
    └── IMAGE-CREDITS.md          # Image attribution
```

---

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for Firebase services

### Accessing the Application

1. **Start from Home Page:**
   Open `index.html` in your browser to access the landing page.

2. **Sign Up:**
   - Click "Sign In" from the home page
   - Choose your role: Patron, Vendor, Officer, or Operator
   - Follow the registration process

3. **Sign In:**
   - Existing users can sign in through their respective login pages
   - Google OAuth is available for select roles

### Entry Points by Role

| Role | Start Page |
|------|------------|
| Guest | `index.html` |
| Patron | `signup.html` → Select "As Patron" |
| Vendor | `signup.html` → Select "As Vendor" |
| Operator | `signupOfficeroperator.html` → Select "As Operator" |
| NEA Officer | `signupOfficeroperator.html` → Select "As Officer" |

---

## Page Guide

### Public Pages (No Login Required)

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Landing page with trending dishes |
| Browse Stalls | `browsestalls.html` | View all available stalls |
| Stall Details | `stalldetails.html` | Individual stall information |
| Menu | `menus.html` | View stall menus |
| Sign Up | `signup.html` | Account creation selection |
| Sign In | `SigninPatron.html`, `SigninVendor.html`, etc. | Login pages |

### Patron Pages (Login Required)

| Page | File | Description |
|------|------|-------------|
| Cart | `cart.html` | View and manage cart items |
| Checkout | `checkout.html` | Complete order payment |
| Order History | `history.html` | View past orders |
| Favorites | `Likes.html` | Saved stalls and dishes |
| Profile | `PatronProfile.html` | Manage account details |
| Feedback | `feedback.html` | Submit stall feedback |
| Complaints | `complaint.html` | File complaints |

### Vendor Pages (Login Required)

| Page | File | Description |
|------|------|-------------|
| Dashboard | `VenderAccount.html` | Main vendor overview |
| Orders | `VendorOrder.html` | Manage incoming orders |
| Stall Details | `VendorStallDetails.html` | Edit stall information |
| Menu | Managed via dashboard | Add/Edit menu items |
| Complaints | `VendorComplaints.html` | View customer complaints |
| Analytics | `analytics.html` | View business metrics |
| Lease | `VendorLeaseLicense.html` | License management |

### Operator Pages (Login Required)

| Page | File | Description |
|------|------|-------------|
| Dashboard | `operator.html` | Centre overview and analytics |
| Stall Management | Within `operator.html` | Manage vendor stalls |
| Settings | Within `operator.html` | Account settings |

### NEA Officer Pages (Login Required)

| Page | File | Description |
|------|------|-------------|
| Dashboard | `NEAofficer.html` | Inspection overview |
| Stall Directory | Within `NEAofficer.html` | List of all stalls |
| Schedule | Within `NEAofficer.html` | Inspection scheduling |
| Inspection | `inspection.html` | Conduct inspections |

---

## Image Credits

All images used in this project are sourced from royalty-free stock photo websites. Detailed attribution can be found in [IMAGE-CREDITS.md](./IMAGE-CREDITS.md).

### Quick Attribution Summary

| Source | Usage |
|--------|-------|
| **Pexels** | Food photography, backgrounds |
| **Freepik** | UI elements, food images |
| **Flaticon** | Icons and symbols |
| **Unsplash** | General photography |
| **Custom/Original** | Logo, some UI graphics |

---

## Firebase Configuration

The application uses Firebase for backend services. Configuration is located in `firebase-init.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDo8B0OLtAj-Upfz7yNFeGz4cx3KWLZLuQ",
  authDomain: "hawkerhub-64e2d.firebaseapp.com",
  databaseURL: "https://hawkerhub-64e2d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hawkerhub-64e2d",
  storageBucket: "hawkerhub-64e2d.firebasestorage.app",
  messagingSenderId: "722888051277",
  appId: "1:722888051277:web:59926d0a54ae0e4fe36a04"
};
```

---

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## Contributing

This is a student group project. For any updates or modifications:

1. Ensure changes follow the existing code style
2. Test thoroughly across different user roles
3. Update documentation as needed
4. Verify image credits for any new assets

---

## License

This project is created for educational purposes as part of a Front-End Development course assignment.

---

## Acknowledgments

- Singapore hawker culture for inspiration
- Firebase for backend services
- Chart.js for analytics visualization
- Font Awesome for iconography
- All stock photo contributors

---

**Project Version:** 1.0  
**Last Updated:** February 2026  
**Developed By:** Group Assignment Team
