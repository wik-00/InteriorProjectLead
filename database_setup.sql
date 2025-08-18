-- Interior Project Lead - Database setup for MariaDB/MySQL
-- Run this in phpMyAdmin to create the tables

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    profile_image TEXT,
    bio TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    is_provider BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    budget DECIMAL(12,2),
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    is_verified BOOLEAN DEFAULT FALSE,
    is_exclusive BOOLEAN DEFAULT FALSE,
    is_hot_lead BOOLEAN DEFAULT FALSE,
    contact_info TEXT NOT NULL,
    image_url TEXT,
    provider_id INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    buyer_id INT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment orders table for Paytm integration
CREATE TABLE IF NOT EXISTS payment_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(100) NOT NULL UNIQUE,
    lead_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    txn_id VARCHAR(100),
    paytm_params TEXT,
    paytm_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    buyer_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'upi',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (username, email, password, first_name, last_name, phone_number, profile_image, bio, rating, review_count, is_provider, is_admin) VALUES 
('john_designer', 'john@example.com', 'password123', 'John', 'Smith', '(555) 987-6543', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 'Experienced interior designer specializing in modern and minimalist designs.', 4.80, 42, TRUE, FALSE),
('sarah_interiors', 'sarah@example.com', 'password123', 'Sarah', 'Johnson', '(555) 456-7890', 'https://images.unsplash.com/photo-1494790108755-2616b612b93c?w=150&h=150&fit=crop&crop=face', 'Award-winning interior designer with 10+ years of experience in luxury homes.', 4.90, 38, TRUE, FALSE),
('mike_buyer', 'mike@example.com', 'password123', 'Mike', 'Brown', '(555) 321-9876', NULL, NULL, 0.00, 0, FALSE, FALSE),
('admin_user', 'admin@example.com', 'admin123', 'Admin', 'User', '(555) 123-4567', NULL, 'Platform administrator', 5.00, 1, FALSE, TRUE);

INSERT INTO leads (title, description, category, location, price, budget, status, is_verified, is_exclusive, is_hot_lead, contact_info, image_url, provider_id) VALUES 
('Modern Living Room Design', 'Complete living room makeover with contemporary furniture and color scheme. Looking for a sophisticated yet comfortable space.', 'Living Room', 'New York, NY', 2500.00, 5000.00, 'available', TRUE, FALSE, TRUE, 'Contact: Sarah Johnson, sarah@example.com, (555) 123-4567', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop', 2),
('Kitchen Renovation Project', 'Full kitchen renovation including cabinets, countertops, and modern appliances. Prefer minimalist design.', 'Kitchen', 'Los Angeles, CA', 3200.00, 8000.00, 'available', TRUE, TRUE, TRUE, 'Contact: John Smith, john@example.com, (555) 987-6543', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop', 1),
('Master Bedroom Suite', 'Luxury master bedroom design with walk-in closet organization. Looking for elegant and relaxing atmosphere.', 'Bedroom', 'Miami, FL', 1800.00, 4000.00, 'available', FALSE, FALSE, FALSE, 'Contact: Private Client, (555) 456-7890', 'https://images.unsplash.com/photo-1540518614846-7eded47ee3ea?w=400&h=300&fit=crop', 2),
('Home Office Setup', 'Professional home office design for remote work. Need ergonomic furniture and proper lighting.', 'Office', 'Austin, TX', 1200.00, 2500.00, 'pending', TRUE, FALSE, FALSE, 'Contact: Tech Professional, office@email.com', 'https://images.unsplash.com/photo-1541746972996-4e0b0f93e586?w=400&h=300&fit=crop', 1),
('Dining Room Makeover', 'Traditional dining room renovation with antique furniture restoration and classic decor.', 'Dining Room', 'Boston, MA', 2000.00, 4500.00, 'available', TRUE, FALSE, TRUE, 'Contact: Family Home, dining@email.com, (555) 321-9876', 'https://images.unsplash.com/photo-1574045892677-6b5d0c6e20de?w=400&h=300&fit=crop', 2);