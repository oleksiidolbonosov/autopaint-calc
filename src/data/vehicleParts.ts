import {
  PartGroupCategory,
  VehiclePartDefinition,
  VehiclePartId,
  VehicleType,
} from '../types/models';

export const VEHICLE_TYPE_MULTIPLIER: Record<VehicleType, number> = {
  car: 1.0,
  van: 1.4,
  truck: 2.0,
};

export const PART_GROUP_ORDER: PartGroupCategory[] = [
  'front',
  'top',
  'side_left',
  'side_right',
  'rear',
  'openings',
];

export const VEHICLE_PARTS: VehiclePartDefinition[] = [
  // Full Respray
  {
    id: 'full_respray',
    category: 'full',
    vehicleTypes: ['car', 'van', 'truck'],
    views: ['top', 'front', 'rear', 'left', 'right'],
    defaultAreaFactor: 10.5,
  },

  // Front
  { id: 'front_bumper', category: 'front', vehicleTypes: ['car', 'van', 'truck'], views: ['front', 'top', 'left', 'right'], defaultAreaFactor: 1.1 },
  { id: 'front_grille', category: 'front', vehicleTypes: ['car', 'van', 'truck'], views: ['front'], defaultAreaFactor: 0.45 },
  { id: 'hood', category: 'front', vehicleTypes: ['car', 'van'], views: ['top', 'front', 'left', 'right'], defaultAreaFactor: 1.35 },
  { id: 'hood_inner', category: 'front', vehicleTypes: ['car', 'van'], views: ['top', 'front'], defaultAreaFactor: 0.95 },
  { id: 'truck_front_panel', category: 'front', vehicleTypes: ['truck'], views: ['front', 'top', 'left', 'right'], defaultAreaFactor: 1.65 },
  { id: 'truck_visor', category: 'front', vehicleTypes: ['truck'], views: ['front', 'top', 'left', 'right'], defaultAreaFactor: 0.7 },

  // Top / Roof
  { id: 'roof', category: 'top', vehicleTypes: ['car'], views: ['top', 'front', 'rear', 'left', 'right'], defaultAreaFactor: 1.5 },
  { id: 'van_high_roof', category: 'top', vehicleTypes: ['van'], views: ['top', 'front', 'rear', 'left', 'right'], defaultAreaFactor: 2.6 },
  { id: 'truck_cab_roof', category: 'top', vehicleTypes: ['truck'], views: ['top', 'front', 'rear', 'left', 'right'], defaultAreaFactor: 2.2 },

  // Left Side
  { id: 'front_left_fender', category: 'side_left', vehicleTypes: ['car', 'van'], views: ['left', 'top', 'front'], defaultAreaFactor: 0.85 },
  { id: 'front_left_door', category: 'side_left', vehicleTypes: ['car', 'van', 'truck'], views: ['left', 'top'], defaultAreaFactor: 1.0 },
  { id: 'rear_left_door', category: 'side_left', vehicleTypes: ['car'], views: ['left', 'top'], defaultAreaFactor: 1.0 },
  { id: 'rear_left_quarter', category: 'side_left', vehicleTypes: ['car'], views: ['left', 'top', 'rear'], defaultAreaFactor: 1.05 },
  { id: 'van_sliding_door_left', category: 'side_left', vehicleTypes: ['van'], views: ['left', 'top'], defaultAreaFactor: 1.45 },
  { id: 'van_left_upper_panel', category: 'side_left', vehicleTypes: ['van'], views: ['left', 'top', 'rear'], defaultAreaFactor: 1.8 },
  { id: 'truck_sleeper_left', category: 'side_left', vehicleTypes: ['truck'], views: ['left', 'top', 'rear'], defaultAreaFactor: 1.6 },
  { id: 'truck_side_fairing_left', category: 'side_left', vehicleTypes: ['truck'], views: ['left', 'top'], defaultAreaFactor: 1.35 },
  { id: 'truck_fender_left', category: 'side_left', vehicleTypes: ['truck'], views: ['left', 'front'], defaultAreaFactor: 0.9 },
  { id: 'truck_step_left', category: 'side_left', vehicleTypes: ['truck'], views: ['left'], defaultAreaFactor: 0.45 },
  { id: 'left_mirror', category: 'side_left', vehicleTypes: ['car', 'van', 'truck'], views: ['left', 'front', 'top'], defaultAreaFactor: 0.3 },

  // Right Side
  { id: 'front_right_fender', category: 'side_right', vehicleTypes: ['car', 'van'], views: ['right', 'top', 'front'], defaultAreaFactor: 0.85 },
  { id: 'front_right_door', category: 'side_right', vehicleTypes: ['car', 'van', 'truck'], views: ['right', 'top'], defaultAreaFactor: 1.0 },
  { id: 'rear_right_door', category: 'side_right', vehicleTypes: ['car'], views: ['right', 'top'], defaultAreaFactor: 1.0 },
  { id: 'rear_right_quarter', category: 'side_right', vehicleTypes: ['car'], views: ['right', 'top', 'rear'], defaultAreaFactor: 1.05 },
  { id: 'van_sliding_door_right', category: 'side_right', vehicleTypes: ['van'], views: ['right', 'top'], defaultAreaFactor: 1.45 },
  { id: 'van_right_upper_panel', category: 'side_right', vehicleTypes: ['van'], views: ['right', 'top', 'rear'], defaultAreaFactor: 1.8 },
  { id: 'truck_sleeper_right', category: 'side_right', vehicleTypes: ['truck'], views: ['right', 'top', 'rear'], defaultAreaFactor: 1.6 },
  { id: 'truck_side_fairing_right', category: 'side_right', vehicleTypes: ['truck'], views: ['right', 'top'], defaultAreaFactor: 1.35 },
  { id: 'truck_fender_right', category: 'side_right', vehicleTypes: ['truck'], views: ['right', 'front'], defaultAreaFactor: 0.9 },
  { id: 'truck_step_right', category: 'side_right', vehicleTypes: ['truck'], views: ['right'], defaultAreaFactor: 0.45 },
  { id: 'right_mirror', category: 'side_right', vehicleTypes: ['car', 'van', 'truck'], views: ['right', 'front', 'top'], defaultAreaFactor: 0.3 },
  { id: 'fuel_door', category: 'side_right', vehicleTypes: ['car', 'van'], views: ['right'], defaultAreaFactor: 0.2 },

  // Rear
  { id: 'trunk_lid', category: 'rear', vehicleTypes: ['car'], views: ['top', 'rear', 'left', 'right'], defaultAreaFactor: 1.0 },
  { id: 'rear_spoiler', category: 'rear', vehicleTypes: ['car'], views: ['rear', 'top'], defaultAreaFactor: 0.4 },
  { id: 'van_rear_left_door', category: 'rear', vehicleTypes: ['van'], views: ['rear', 'top', 'left'], defaultAreaFactor: 1.2 },
  { id: 'van_rear_right_door', category: 'rear', vehicleTypes: ['van'], views: ['rear', 'top', 'right'], defaultAreaFactor: 1.2 },
  { id: 'truck_rear_wall', category: 'rear', vehicleTypes: ['truck'], views: ['rear', 'top'], defaultAreaFactor: 1.85 },
  { id: 'rear_bumper', category: 'rear', vehicleTypes: ['car', 'van'], views: ['rear', 'top', 'left', 'right'], defaultAreaFactor: 1.1 },

  // Openings, Jambs, Pillars, Arches & Sills
  { id: 'front_left_jamb', category: 'openings', vehicleTypes: ['car', 'van', 'truck'], views: ['left'], defaultAreaFactor: 0.55 },
  { id: 'front_right_jamb', category: 'openings', vehicleTypes: ['car', 'van', 'truck'], views: ['right'], defaultAreaFactor: 0.55 },
  { id: 'rear_left_jamb', category: 'openings', vehicleTypes: ['car', 'van'], views: ['left'], defaultAreaFactor: 0.55 },
  { id: 'rear_right_jamb', category: 'openings', vehicleTypes: ['car', 'van'], views: ['right'], defaultAreaFactor: 0.55 },
  { id: 'trunk_jamb', category: 'openings', vehicleTypes: ['car', 'van'], views: ['rear'], defaultAreaFactor: 0.6 },
  { id: 'left_a_pillar', category: 'openings', vehicleTypes: ['car', 'van', 'truck'], views: ['front', 'left', 'top'], defaultAreaFactor: 0.45 },
  { id: 'right_a_pillar', category: 'openings', vehicleTypes: ['car', 'van', 'truck'], views: ['front', 'right', 'top'], defaultAreaFactor: 0.45 },
  { id: 'left_c_pillar', category: 'openings', vehicleTypes: ['car'], views: ['rear', 'left', 'top'], defaultAreaFactor: 0.45 },
  { id: 'right_c_pillar', category: 'openings', vehicleTypes: ['car'], views: ['rear', 'right', 'top'], defaultAreaFactor: 0.45 },
  { id: 'left_sill', category: 'openings', vehicleTypes: ['car', 'van'], views: ['left'], defaultAreaFactor: 0.7 },
  { id: 'right_sill', category: 'openings', vehicleTypes: ['car', 'van'], views: ['right'], defaultAreaFactor: 0.7 },
  { id: 'front_left_arch', category: 'openings', vehicleTypes: ['car', 'van'], views: ['left'], defaultAreaFactor: 0.4 },
  { id: 'front_right_arch', category: 'openings', vehicleTypes: ['car', 'van'], views: ['right'], defaultAreaFactor: 0.4 },
  { id: 'rear_left_arch', category: 'openings', vehicleTypes: ['car', 'van'], views: ['left'], defaultAreaFactor: 0.45 },
  { id: 'rear_right_arch', category: 'openings', vehicleTypes: ['car', 'van'], views: ['right'], defaultAreaFactor: 0.45 },
];

export const VEHICLE_PART_MAP = new Map<VehiclePartId, VehiclePartDefinition>(
  VEHICLE_PARTS.map((p) => [p.id, p])
);
