export interface DemoUser {
  id: string;
  name: string;
  email: string;
  user_type: string;
  tenant?: {
    name: string;
  };
}
