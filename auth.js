const crypto = require('crypto');

// Configuration for hashing
const SALT_LENGTH = 16; // 16 bytes
const KEY_LENGTH = 64;  // 64 bytes
const ITERATIONS = 10000;
const DIGEST = 'sha512';

/**
 * Hash a password using PBKDF2
 * Returns format: salt:hash
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash (salt:hash)
 */
function verifyPassword(password, storedHash) {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;

    const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
    return hash === originalHash;
}

/**
 * Permission definitions
 */
const ROLES = {
    ADMIN: 'admin',
    FINANCEIRO: 'financeiro',
    MECANICO: 'mecanico'
};

const PERMISSIONS = {
    [ROLES.ADMIN]: ['*'], // Access to everything
    [ROLES.FINANCEIRO]: [
        'view_dashboard', 'manage_payments', 'manage_budgets', 'manage_services', 'manage_clients',
        'view_reports', 'create_edit_os'
    ],
    [ROLES.MECANICO]: [
        'manage_clients', 'manage_vehicles', 'view_services', 'create_edit_os_technical', 'view_products'
    ]
};

function hasPermission(userRole, requiredPermission) {
    const userPermissions = PERMISSIONS[userRole] || [];
    if (userPermissions.includes('*')) return true;
    return userPermissions.includes(requiredPermission);
}

module.exports = {
    hashPassword,
    verifyPassword,
    ROLES,
    PERMISSIONS,
    hasPermission
};
