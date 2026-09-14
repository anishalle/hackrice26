"""Run on the Hermes host: python install.py /path/to/hermes-agent."""
import shutil
import sys
from pathlib import Path

root = Path(sys.argv[1])
path = root / 'gateway/platforms/api_server.py'
source = path.read_text()
if '# AXL_BRIDGE_V1' not in source:
    route_anchor = '        routes: List[tuple] = ['
    create_anchor = '        from run_agent import AIAgent\n'
    return_anchor = '        return agent\n\n    # -- HTTP handlers'
    for anchor in (route_anchor, create_anchor, return_anchor):
        if source.count(anchor) != 1:
            raise SystemExit('Hermes source changed; refusing to patch ambiguous anchors')
    shutil.copy2(path, path.with_suffix('.py.axl-backup'))
    source = source.replace(route_anchor, '        from gateway.platforms.axl_bridge import routes as axl_routes\n        routes: List[tuple] = axl_routes() + [ # AXL_BRIDGE_V1')
    source = source.replace(create_anchor, create_anchor + '        from gateway.platforms.axl_bridge import prepare, attach\n        ephemeral_system_prompt, axl_config = prepare(ephemeral_system_prompt)\n')
    source = source.replace(return_anchor, '        return attach(agent, axl_config)\n\n    # -- HTTP handlers')
    compile(source, str(path), 'exec')
    path.write_text(source)
shutil.copy2(Path(__file__).with_name('axl_bridge.py'), root / 'gateway/platforms/axl_bridge.py')
print('Axl bridge installed; restart hermes-gateway to load it')
