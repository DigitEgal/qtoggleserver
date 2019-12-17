
from qtoggleserver.core import api as core_api

from .base import Event


class ValueChange(Event):
    REQUIRED_ACCESS = core_api.ACCESS_LEVEL_VIEWONLY
    TYPE = 'value-change'

    def __init__(self, port):
        self.port = port

        super().__init__()

    def __str__(self):
        return '{}({}) event'.format(self._type, self.port.get_id())

    async def get_params(self):
        return {'id': self.port.get_id(), 'value': self.port.get_value}

    def is_duplicate(self, event):
        return isinstance(event, self.__class__) and event.port == self.port

    def get_handler_args(self):
        return self.port,
