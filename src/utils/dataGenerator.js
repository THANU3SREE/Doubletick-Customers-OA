// src/utils/dataGenerator.js

/**
 * Data generator for creating customer records
 * Generates deterministic data based on ID for consistency
 */

const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Edward', 'Deborah',
  'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura',
  'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy', 'Nicholas', 'Angela'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker'
];

const domains = [
  'gmail.com', 
  'yahoo.com', 
  'outlook.com', 
  'hotmail.com', 
  'company.com',
  'icloud.com',
  'protonmail.com',
  'mail.com'
];

const agents = [
  'Karthey Mishra',
  'Agent Smith', 
  'Agent Jones', 
  'Agent Brown', 
  'Agent Taylor', 
  'Agent Wilson',
  'Agent Anderson',
  'Agent Thomas'
];

/**
 * Generate a single customer record
 * @param {number} id - Customer ID (1-based)
 * @returns {Object} Customer object with all required fields
 */
export function generateCustomer(id) {
  // Use modulo to cycle through names deterministically
  const firstName = firstNames[id % firstNames.length];
  const lastNameIndex = Math.floor(id / firstNames.length) % lastNames.length;
  const lastName = lastNames[lastNameIndex];
  const name = `${firstName} ${lastName}`;
  
  // Create unique email
  const emailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const domain = domains[id % domains.length];
  const email = `${emailPrefix}${id}@${domain}`;
  
  // Generate phone number (10 digits, padded)
  const phone = `+1${String(id).padStart(10, '0')}`;
  
  // Score between 0-100 (deterministic)
  const score = (id * 7) % 100;
  
  // Assign agent (cycle through agents)
  const addedBy = agents[id % agents.length];
  
  // Last message date (spread across last year)
  const daysAgo = (id % 365);
  const lastMessageAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  
  return {
    id,
    name,
    phone,
    email,
    score,
    lastMessageAt: lastMessageAt.toISOString(),
    addedBy,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
  };
}

/**
 * Generator function to create customers in batches
 * This prevents memory issues when generating large datasets
 * @param {number} totalCount - Total number of customers to generate
 * @param {number} batchSize - Number of customers per batch (default: 1000)
 * @yields {Array} Batch of customer objects
 */
export function* generateCustomerBatches(totalCount, batchSize = 1000) {
  for (let i = 1; i <= totalCount; i += batchSize) {
    const batch = [];
    const end = Math.min(i + batchSize, totalCount + 1);
    
    for (let j = i; j < end; j++) {
      batch.push(generateCustomer(j));
    }
    
    yield batch;
  }
}

/**
 * Generate all customers at once (not recommended for large datasets)
 * @param {number} count - Total number of customers
 * @returns {Array} Array of all customer objects
 */
export function generateCustomers(count = 1000000) {
  const customers = [];
  for (let i = 1; i <= count; i++) {
    customers.push(generateCustomer(i));
  }
  return customers;
}