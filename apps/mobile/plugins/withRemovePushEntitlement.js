const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withRemovePushEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    console.log('[withRemovePushEntitlement] ✓ Removed aps-environment entitlement (free Apple ID)');
    return mod;
  });
};
