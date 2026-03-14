const { validationResult } = require('express-validator');

/**
 * Runs express-validator result check and returns 422 on failure.
 * Usage: place after your validation chain in a route, e.g.:
 *   router.post('/', [body('email').isEmail()], validate, handler)
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
}

module.exports = { validate };
