// Define the expected type for the useAuth hook's return value
export interface AuthContextType {
  user: any; // Replace `any` with your actual user type
  isAuthenticated: boolean;
  login: (userData: any) => Promise<any>; // Adjust according to the actual parameters and types
  verifyLogin: (data: any) => Promise<any>; // Add verifyLogin method
  logout: () => void;
}

export interface LoginFormFields {
  phoneNumber: string;
  password: string;
}

export interface ForgotPasswordFormFields {
  phoneNumber: string;
}


// Define the types for the form data
export type SignUpFormData = {
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

export type SignUpBusinessFormData = {
  userId: string;
  ownerName: string;
  businessName: string;
  location: string;
  phoneNumber: string;
  businessType: string;
};


export type OTPFormData = {
  phoneNumber: string;
  newPassword: string;
  otp: string;
};


