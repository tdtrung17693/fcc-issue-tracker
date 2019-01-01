
const required = (fields) => {
  return function (req, res, next) {
    let errors = []
    let keys = Object.keys(req.body)
    
    fields.forEach(field => {
      if (keys.indexOf(field) === -1) {
        errors.push(field)
      }
    })
    
    if (errors.length > 0) return next({ error: 'Required fields', message: `Missing: ${errors.join(', ')}` })
    
    next(null)
  }
}

module.exports = {
  required
}