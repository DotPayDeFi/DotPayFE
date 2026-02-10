// Debug script to check authentication status
// Run this in your browser console to check your auth status

function checkAuthStatus() {
  console.log('=== Authentication Status Check ===');
  
  // Check localStorage
  const dotpayToken = localStorage.getItem('dotpay_token');
  const user = localStorage.getItem('user');
  const dotpayUser = localStorage.getItem('dotpay_user');
  
  console.log('1. dotpay_token:', dotpayToken ? 'Present' : 'Missing');
  console.log('2. user:', user ? 'Present' : 'Missing');
  console.log('3. dotpay_user:', dotpayUser ? 'Present' : 'Missing');
  
  // Check sessionStorage
  const sessionToken = sessionStorage.getItem('dotpay_token');
  const sessionUser = sessionStorage.getItem('user');
  
  console.log('4. sessionStorage dotpay_token:', sessionToken ? 'Present' : 'Missing');
  console.log('5. sessionStorage user:', sessionUser ? 'Present' : 'Missing');
  
  // Try to parse the token
  if (dotpayToken) {
    try {
      const parsed = JSON.parse(dotpayToken);
      console.log('6. Parsed dotpay_token:', parsed);
    } catch (e) {
      console.log('6. dotpay_token (raw):', dotpayToken.substring(0, 50) + '...');
    }
  }
  
  if (user) {
    try {
      const parsed = JSON.parse(user);
      console.log('7. Parsed user:', parsed);
    } catch (e) {
      console.log('7. user (raw):', user.substring(0, 50) + '...');
    }
  }
  
  console.log('=== End Authentication Check ===');
}

// Auto-run the check
checkAuthStatus();

// Export for manual use
window.checkAuthStatus = checkAuthStatus;
