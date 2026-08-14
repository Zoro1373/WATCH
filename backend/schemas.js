const Joi = require('joi');

const sensorSchema = Joi.object({
  nodeId: Joi.string().min(1).required(),
  timestamp: Joi.date().iso().required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  ph: Joi.number().min(0).max(14).required(),
  tds: Joi.number().min(0).required(),
  turbidity: Joi.number().min(0).required(),
  temperature: Joi.number().min(-50).max(100).required()
});

const symptomSchema = Joi.object({
  villageId: Joi.string().min(1).required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }).optional(),
  timestamp: Joi.date().iso().optional(),
  feverCount: Joi.number().integer().min(0).required(),
  diarrheaCount: Joi.number().integer().min(0).required(),
  vomitingCount: Joi.number().integer().min(0).required(),
  abdominalPainCount: Joi.number().integer().min(0).required()
});

const locationParamSchema = Joi.object({
  location: Joi.string().custom((value, helpers) => {
    const parts = value.split(',');
    if (parts.length !== 2) return helpers.message("Location must be in 'lat,lon' format");
    
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    
    if (isNaN(lat) || lat < -90 || lat > 90) return helpers.message("Latitude must be a valid number between -90 and 90");
    if (isNaN(lon) || lon < -180 || lon > 180) return helpers.message("Longitude must be a valid number between -180 and 180");
    
    return value;
  }).required()
});

module.exports = {
  sensorSchema,
  symptomSchema,
  locationParamSchema
};
