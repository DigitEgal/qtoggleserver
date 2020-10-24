
from qtoggleserver.core import api as core_api
from qtoggleserver.core import webhooks as core_webhooks
from qtoggleserver.core.api import schema as core_api_schema
from qtoggleserver.core.typing import GenericJSONDict


@core_api.api_call(core_api.ACCESS_LEVEL_ADMIN)
async def get_webhooks(request: core_api.APIRequest) -> GenericJSONDict:
    return core_webhooks.get().to_json()


@core_api.api_call(core_api.ACCESS_LEVEL_ADMIN)
async def put_webhooks(request: core_api.APIRequest, params: GenericJSONDict) -> None:
    core_api_schema.validate(params, core_api_schema.PATCH_WEBHOOKS)

    # Also ensure that needed fields are not empty when webhooks are enabled
    if params['enabled']:
        if not params['host']:
            raise core_api.APIError(400, 'invalid-field', field='host')
        if not params['path']:
            raise core_api.APIError(400, 'invalid-field', field='path')

    try:
        core_webhooks.setup(**params)

    except core_webhooks.InvalidParamError as e:
        raise core_api.APIError(400, 'invalid-field', field=e.param) from e

    core_webhooks.save()
