const withFallbackId = (entry, idKey, idValue) => {
  if (!entry || typeof entry !== 'object') return entry;
  if (!idKey || entry[idKey] !== undefined || idValue === undefined || idValue === null) return entry;
  return { ...entry, [idKey]: idValue };
};

export const normalizeRegistryEntries = (raw, idKey = '') => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((entry) => !!entry && typeof entry === 'object');
  if (typeof Map !== 'undefined' && raw instanceof Map) {
    return Array.from(raw.entries())
      .map(([key, value]) => withFallbackId(value, idKey, key))
      .filter((entry) => !!entry && typeof entry === 'object');
  }
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([key, value]) => withFallbackId(value, idKey, key))
      .filter((entry) => !!entry && typeof entry === 'object');
  }
  return [];
};

const indexBy = (entries, keys) => {
  const map = new Map();
  entries.forEach((entry) => {
    keys.forEach((key) => {
      const id = entry?.[key];
      if (id !== undefined && id !== null && id !== '') map.set(String(id), entry);
    });
  });
  return map;
};

export const buildHomeAssistantRegistryData = ({ areas = [], devices = [], entities = [] } = {}) => {
  const areaEntries = normalizeRegistryEntries(areas, 'area_id');
  const deviceEntries = normalizeRegistryEntries(devices, 'id');
  const entityEntries = normalizeRegistryEntries(entities, 'entity_id');
  return {
    areas: areaEntries,
    devices: deviceEntries,
    entities: entityEntries,
    areasById: indexBy(areaEntries, ['area_id', 'id']),
    devicesById: indexBy(deviceEntries, ['id']),
    entitiesById: indexBy(entityEntries, ['entity_id', 'entity']),
  };
};

export const callHomeAssistantRegistry = (hass, type) => {
  if (!hass || !type) return null;
  try {
    if (typeof hass.callWS === 'function') return hass.callWS({ type });
    const connection = hass.connection;
    if (connection && typeof connection.sendMessagePromise === 'function') {
      return connection.sendMessagePromise({ type });
    }
    if (connection && typeof connection.sendMessage === 'function') {
      return connection.sendMessage({ type });
    }
  } catch (err) {
    return Promise.reject(err);
  }
  return null;
};

export const metadataPathNeedsRegistry = (path) => {
  if (path === undefined || path === null) return false;
  const first = String(path).replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)[0] || '';
  return first === 'area'
    || first === 'area_id'
    || first === 'area_name'
    || first === 'device'
    || first === 'device_id'
    || first === 'device_name'
    || first === 'entity_registry';
};

export const resolveEntityRegistryMeta = (registryData, stateObjOrEntityId) => {
  const entityId = typeof stateObjOrEntityId === 'string'
    ? stateObjOrEntityId
    : stateObjOrEntityId?.entity_id;
  const empty = {
    entity_registry: undefined,
    device: undefined,
    area: undefined,
    device_id: '',
    device_name: '',
    area_id: '',
    area_name: '',
  };
  if (!registryData || !entityId) return empty;

  const entityEntry = registryData.entitiesById?.get(String(entityId));
  const deviceId = entityEntry?.device_id || '';
  const device = deviceId ? registryData.devicesById?.get(String(deviceId)) : undefined;
  const areaId = entityEntry?.area_id || device?.area_id || '';
  const area = areaId ? registryData.areasById?.get(String(areaId)) : undefined;
  const deviceName = device?.name_by_user || device?.name || device?.default_name || '';
  const areaName = area?.name || area?.name_by_user || '';

  return {
    entity_registry: entityEntry,
    device,
    area,
    device_id: deviceId || '',
    device_name: deviceName,
    area_id: areaId || '',
    area_name: areaName,
  };
};

export const getHomeAssistantRegistryData = (host) => {
  if (!host?.hass) return host?._registryData;

  const connection = host.hass.connection || host.hass;
  if (host._registryConnection !== connection) {
    host._registryConnection = connection;
    host._registryData = null;
    host._registryLoadPromise = null;
    host._registrySource = null;
  }

  const hasContextData = host.hass.areas !== undefined
    && host.hass.devices !== undefined
    && host.hass.entities !== undefined;
  if (hasContextData) {
    const source = {
      kind: 'hass',
      areas: host.hass.areas,
      devices: host.hass.devices,
      entities: host.hass.entities,
    };
    const sameSource = host._registrySource
      && host._registrySource.kind === source.kind
      && host._registrySource.areas === source.areas
      && host._registrySource.devices === source.devices
      && host._registrySource.entities === source.entities;
    if (!host._registryData || !sameSource) {
      host._registryData = buildHomeAssistantRegistryData(source);
      host._registrySource = source;
    }
    return host._registryData;
  }

  return host._registryData;
};

export const ensureHomeAssistantRegistryData = (host) => {
  const currentData = getHomeAssistantRegistryData(host);
  if (!host?.hass || currentData || host._registryLoadPromise) return currentData;

  const connection = host.hass.connection || host.hass;

  if (host._registryData || host._registryLoadPromise) return host._registryData;

  const requests = [
    callHomeAssistantRegistry(host.hass, 'config/area_registry/list'),
    callHomeAssistantRegistry(host.hass, 'config/device_registry/list'),
    callHomeAssistantRegistry(host.hass, 'config/entity_registry/list'),
  ];
  if (requests.some((request) => !request || typeof request.then !== 'function')) return host._registryData;

  const connectionAtRequest = connection;
  host._registryLoadPromise = Promise.all(requests)
    .then(([areas, devices, entities]) => {
      const currentConnection = host.hass?.connection || host.hass;
      if (currentConnection !== connectionAtRequest) return;
      host._registryData = buildHomeAssistantRegistryData({ areas, devices, entities });
      host._registrySource = { kind: 'ws', connection: connectionAtRequest };
      host._registryLoadPromise = null;
      host.requestUpdate?.();
    })
    .catch(() => {
      host._registryLoadPromise = null;
    });

  return host._registryData;
};
