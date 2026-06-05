import { z } from 'zod';

export const CreateRestaurantSchema = z.object({
  name: z.string().min(1).max(100),
  cuisine_type: z.string().max(50).optional(),
  department_store: z.string().min(1).max(100),
  floor: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  image_url: z.string().url().max(500).optional().or(z.literal('')),
  order_cutoff_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  min_order_type: z.enum(['items', 'amount']).optional(),
  min_order_value: z.number().int().min(1).max(10000).optional(),
  location_ids: z.array(z.number().int().positive()).max(50).optional(),
  pickup_times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(20).optional(),
});

export const UpdateRestaurantSchema = CreateRestaurantSchema.partial();

export const CreateLocationSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(200).optional(),
});

export const UpdateLocationSchema = CreateLocationSchema.partial();

export const CreateMenuItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().int().min(0).max(100000),
  category: z.string().max(50).optional(),
  image_url: z.string().url().max(500).optional().or(z.literal('')),
});

export const UpdateMenuItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  price: z.number().int().min(0).max(100000).optional(),
  category: z.string().max(50).optional(),
  image_url: z.string().url().max(500).optional().or(z.literal('')),
  available: z.number().int().min(0).max(1).optional(),
});

export const CreateOrderSchema = z.object({
  company_id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  restaurant_id: z.number().int().positive(),
  location_id: z.number().int().positive(),
  pickup_time: z.string().regex(/^\d{2}:\d{2}$/),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(z.object({
    menu_item_id: z.number().int().positive(),
    quantity: z.number().int().min(1).max(100),
    special_requests: z.string().max(200).optional(),
  })).min(1).max(50),
  payment_method: z.string().max(20).optional().nullable(),
  company_name: z.string().min(1).max(100).optional(),
  tax_id: z.string().min(1).max(20).optional()
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'arrived', 'completed', 'cancelled']),
  cancellation_reason: z.string().max(200).optional(),
});

export const ApproveStaffRequestSchema = z.object({
  restaurant_id: z.number().int().positive(),
  role: z.enum(['staff', 'manager']).optional(),
});

export const AddStaffSchema = z.object({
  line_user_id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  role: z.enum(['staff', 'manager']).optional(),
});

export const UpdateStaffSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['staff', 'manager']).optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});

export const LineLoginSchema = z.object({
  access_token: z.string().min(1).max(2000),
});

export const AdminLoginSchema = z.object({
  password: z.string().min(1).max(200),
});

// Query parameter schemas
export const DateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const AdminOrdersQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  restaurant_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['pending', 'confirmed', 'preparing', 'arrived', 'completed', 'cancelled']).optional(),
});

export const DashboardOrdersQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
