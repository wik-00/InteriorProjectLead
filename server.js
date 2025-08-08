const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static website files from root
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve main pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/leads', (req, res) => {
  res.sendFile(path.join(__dirname, 'leads.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

// Basic API endpoints for the website
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple authentication logic
  const users = {
    'umairsaif': { password: 'umairsaif7', role: 'admin' },
    'john_doe': { password: 'password', role: 'user' },
    'sarah_m': { password: 'password', role: 'user' }
  };
  
  if (users[username] && users[username].password === password) {
    res.json({ 
      success: true, 
      user: { username, role: users[username].role },
      message: 'Login successful' 
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/api/leads', (req, res) => {
  // Sample leads data
  const leads = [
    {
      id: 1,
      title: "Luxury Apartment Interior Design",
      location: "Delhi",
      budget: "₹5,00,000",
      description: "Complete interior design for 3BHK luxury apartment in Delhi NCR with modern contemporary style",
      contact: { name: "Rajesh Kumar", phone: "+91 9876543210", email: "rajesh@email.com" },
      requirements: "Modern contemporary design, premium materials",
      timeline: "3 months",
      category: "Residential"
    },
    {
      id: 2,
      title: "Office Space Design",
      location: "Mumbai",
      budget: "₹8,00,000",
      description: "Corporate office interior for 50-seater workspace with professional ambiance",
      contact: { name: "Priya Sharma", phone: "+91 9876543211", email: "priya@email.com" },
      requirements: "Professional workspace with meeting rooms",
      timeline: "2 months",
      category: "Commercial"
    },
    {
      id: 3,
      title: "Restaurant Interior",
      location: "Bangalore",
      budget: "₹12,00,000",
      description: "Fine dining restaurant with modern ambiance and elegant seating",
      contact: { name: "Amit Verma", phone: "+91 9876543212", email: "amit@email.com" },
      requirements: "Elegant dining space with kitchen design",
      timeline: "4 months",
      category: "Commercial"
    },
    {
      id: 4,
      title: "Villa Interior Design",
      location: "Chennai",
      budget: "₹15,00,000",
      description: "Complete interior design for 4BHK independent villa with traditional South Indian elements",
      contact: { name: "Lakshmi Iyer", phone: "+91 9876543213", email: "lakshmi@email.com" },
      requirements: "Traditional meets modern design",
      timeline: "5 months",
      category: "Residential"
    },
    {
      id: 5,
      title: "Boutique Store Interior",
      location: "Kolkata",
      budget: "₹6,00,000",
      description: "Fashion boutique interior with attractive display areas and customer lounge",
      contact: { name: "Suman Das", phone: "+91 9876543214", email: "suman@email.com" },
      requirements: "Trendy retail space with storage",
      timeline: "2 months",
      category: "Commercial"
    }
  ];
  
  res.json({ success: true, leads });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Catch all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Interior Lead Marketplace Website running on port ${PORT}`);
  console.log(`Access the website at: http://localhost:${PORT}`);
});