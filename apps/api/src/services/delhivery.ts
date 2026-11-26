import { ShipmentStatus } from '@anuvarnika/shared';

export interface DelhiveryLiveResult {
  found: boolean;
  status: ShipmentStatus;
  location?: string;
  remarks?: string;
  scans: Array<{
    status: ShipmentStatus;
    timestamp: number;
    location?: string;
    remarks?: string;
  }>;
}

function mapDelhiveryStatus(rawStatus: string, statusType?: string): ShipmentStatus {
  const s = (rawStatus || '').toLowerCase();
  const t = (statusType || '').toLowerCase();
  if (s.includes('delivered') && !s.includes('not') && !s.includes('undelivered')) {
    return 'delivered';
  }
  if (s.includes('rto') || t === 'rt') {
    return 'rto';
  }
  if (s.includes('out for delivery') || s.includes('dispatched')) {
    return 'out_for_delivery';
  }
  if (s.includes('in transit') || s.includes('pending') || t === 'it') {
    return 'in_transit';
  }
  if (s.includes('picked') || s.includes('collected')) {
    return 'picked_up';
  }
  return 'booked';
}

/**
 * Fetches live package tracking from Delhivery's Tracking API.
 * Requires a free Delhivery merchant API token (DELHIVERY_API_TOKEN).
 */
export async function fetchDelhiveryLiveTracking(
  awbNumber: string,
  token?: string
): Promise<DelhiveryLiveResult | null> {
  if (!token || !awbNumber) {
    return null;
  }

  try {
    const url = `https://track.delhivery.com/api/v1/packages/json/?waybill=${encodeURIComponent(
      awbNumber.trim()
    )}&token=${encodeURIComponent(token.trim())}`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return null;
    }

    const data: any = await res.json();
    const shipment = data?.ShipmentData?.[0]?.Shipment;
    if (!shipment) {
      return { found: false, status: 'booked', scans: [] };
    }

    const currentRaw = shipment.Status?.Status || '';
    const currentType = shipment.Status?.StatusType || '';
    const mappedCurrent = mapDelhiveryStatus(currentRaw, currentType);
    const currentLocation = shipment.Status?.StatusLocation || undefined;
    const currentRemarks = shipment.Status?.Instructions || currentRaw || undefined;

    const rawScans: any[] = Array.isArray(shipment.Scans) ? shipment.Scans : [];
    const scans = rawScans.map((entry) => {
      const detail = entry?.ScanDetail || {};
      const parsedTime = detail.ScanDateTime ? Date.parse(detail.ScanDateTime) : Date.now();
      return {
        status: mapDelhiveryStatus(detail.Scan || '', detail.ScanType || ''),
        timestamp: Number.isNaN(parsedTime) ? Date.now() : parsedTime,
        location: detail.ScannedLocation || undefined,
        remarks: detail.Instructions || detail.Scan || undefined,
      };
    });

    return {
      found: true,
      status: mappedCurrent,
      location: currentLocation,
      remarks: currentRemarks,
      scans,
    };
  } catch (err) {
    console.error('Delhivery live tracking fetch failed:', err);
    return null;
  }
}
