class RouterAgentError(Exception):
    """Base application error."""


class RouterConfigurationError(RouterAgentError):
    """Raised when required configuration is invalid or missing."""


class ScorerNotReadyError(RouterAgentError):
    """Raised when the ML scorer cannot be loaded or used."""


class NoEligibleModelError(RouterAgentError):
    """Raised when no model can satisfy the routing request."""
