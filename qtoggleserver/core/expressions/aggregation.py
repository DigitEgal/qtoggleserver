
from qtoggleserver.core.typing import PortValue as CorePortValue

from .functions import function, Function


@function('MIN')
class MinFunction(Function):
    MIN_ARGS = 2

    def eval(self) -> CorePortValue:
        eval_args = self.eval_args()

        m = eval_args[0]
        for e in eval_args[1:]:
            if e < m:
                m = e

        return m


@function('MAX')
class MaxFunction(Function):
    MIN_ARGS = 2

    def eval(self) -> CorePortValue:
        eval_args = self.eval_args()

        m = eval_args[0]
        for e in eval_args[1:]:
            if e > m:
                m = e

        return m
