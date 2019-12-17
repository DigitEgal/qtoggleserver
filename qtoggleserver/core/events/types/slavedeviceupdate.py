
from qtoggleserver.core import api as core_api

from .base import Event


class SlaveDeviceUpdate(Event):
    REQUIRED_ACCESS = core_api.ACCESS_LEVEL_ADMIN
    TYPE = 'slave-device-update'

    def __init__(self, slave):
        self.slave = slave

        super().__init__()

    def __str__(self):
        return '{}({}) event'.format(self._type, self.slave.get_name())

    async def get_params(self):
        return await self.slave.to_json()

    def is_duplicate(self, event):
        return isinstance(event, self.__class__) and event.slave == self.slave

    def get_handler_args(self):
        return self.slave,
