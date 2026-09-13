export type BeautyService = {
  id: string;
  name: string;
  durationMin: number;
  bufferMin: number;
  price: number;
  active: boolean;
  category?: string;
};

export type WorkingDay = {
  day: number; // 0 Sunday ... 6 Saturday
  enabled: boolean;
  start: string;
  end: string;
};

export type BookingSettings = {
  slotStepMin: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
};

export type TimeOff = {
  id: string;
  date: string; // YYYY-MM-DD
  allDay: boolean;
  start?: string;
  end?: string;
  note?: string;
};

export type Appointment = {
  id: string;
  serviceId: string;
  date: string;
  start: string;
  end: string;
  customerName: string;
  customerPhone: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
};

export type BeautyFlowDemoState = {
  business: {
    name: string;
    city: string;
    category: string;
    description: string;
  };
  services: BeautyService[];
  workingHours: WorkingDay[];
  settings: BookingSettings;
  timeOff: TimeOff[];
  appointments: Appointment[];
};
