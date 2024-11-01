import { request } from 'http';
import path from 'path';

const baseUrl = 'http://localhost:5001';

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const contentType = res.headers['content-type'];
          if (contentType && contentType.includes('application/json')) {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } else {
            resolve({ statusCode: res.statusCode, body: data });
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}


// --- COMMUNITY POSTS ENDPOINTS ---

// Test GET /api/events/:event_id/posts
async function testGetPosts() {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/events/1/posts',
    method: 'GET',
  };

  try {
    const response = await makeRequest(options);
    console.log('GET /api/events/1/posts:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test POST /api/events/:event_id/posts
async function testPostPost() {
  const postData = JSON.stringify({
    event_id: 1,
    user_id: 1,
    content: 'This is a test post',
  });

  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/posts',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
    },
  };

  try {
    const response = await makeRequest(options, postData);
    console.log('POST /api/posts:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test PUT /api/posts/:id
async function testPutPost() {
  const postData = JSON.stringify({
    event_id: 1,
    user_id: 1,
    content: 'This is an updated test post',
  });

  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/posts/1',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
    },
  };

  try {
    const response = await makeRequest(options, postData);
    console.log('PUT /api/posts/1:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test DELETE /api/posts/:id
async function testDeletePost() {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/posts/1',
    method: 'DELETE',
  };

  try {
    const response = await makeRequest(options);
    console.log('DELETE /api/posts/1:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}


// --- EVENTS ENDPOINTS ---

// Test GET /api/events
async function testGetEvents() {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/events',
    method: 'GET',
  };

  try {
    const response = await makeRequest(options);
    console.log('GET /api/events:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test POST /api/events
async function testPostEvent() {
  const postData = JSON.stringify({
    venue_id: 1,
    organizer_id: 1,
    name: 'Test Event',
    description: 'This is a test event',
    event_date: '2024-11-20',
  });

  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/events',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
    },
  };

  try {
    const response = await makeRequest(options, postData);
    console.log('POST /api/events:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test PUT /api/events/:id
async function testPutEvent() {
  const postData = JSON.stringify({
    venue_id: 1,
    organizer_id: 1,
    name: 'Updated Event',
    description: 'This is an updated test event',
    event_date: '2024-11-20',
  });

  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/events/1',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
    },
  };

  try {
    const response = await makeRequest(options, postData);
    console.log('PUT /api/events/1:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test DELETE /api/events/:id
async function testDeleteEvent() {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/events/1',
    method: 'DELETE',
  };

  try {
    const response = await makeRequest(options);
    console.log('DELETE /api/events/1:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

// --- INVITATIONS ENDPOINTS ---

// Test GET /api/events/:event_id/invitations
async function testGetInvitations() {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/events/1/invitations',
    method: 'GET',
  };

  try {
    const response = await makeRequest(options);
    console.log('GET /api/events/1/invitations:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Test POST /api/invitations
async function testPostInvitation() {
  const postData = JSON.stringify({
    event_id: 1,
    user_id: 1,
    status: 'pending',
  });

  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/invitations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
    },
  };

  try {
    const response = await makeRequest(options, postData);
    console.log('POST /api/invitations:', response);
  } catch (error) {
    console.error('Error:', error);
  }
}






// Run all tests
async function runTests() {
  // Community posts endpoints
  await testGetPosts();
  await testPostPost();
  await testPutPost();
  await testDeletePost();

  // Events endpoints
  await testGetEvents();
  await testPostEvent();
  await testPutEvent();
  await testDeleteEvent();

  // Invitations endpoints
  await testGetInvitations();
  await testPostInvitation();
}

runTests();