
import time

from typing import Set

from qtoggleserver.core.typing import PortValue as CorePortValue

from .functions import function, Function


@function('TIME')
class TimeFunction(Function):
    MIN_ARGS = MAX_ARGS = 0

    def get_deps(self) -> Set[str]:
        return {'time'}

    def eval(self) -> CorePortValue:
        return int(time.time())


@function('TIMEMS')
class TimeMSFunction(Function):
    MIN_ARGS = MAX_ARGS = 0

    def get_deps(self) -> Set[str]:
        return {'time_ms'}

    def eval(self) -> CorePortValue:
        return int(time.time() * 1000)
