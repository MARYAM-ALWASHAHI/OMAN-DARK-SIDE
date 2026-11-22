"""Creates /Game/OTD/Maps/L_WadiAlSukoon_Mobile from otd_greybox_layout.py and saves it.

Run INSIDE the Unreal Editor (UE 5.4, plugins PythonScriptPlugin + EditorScriptingUtilities,
both enabled in OmanDarkSide.uproject):
    Tools > Execute Python Script... > Content/Python/otd_build_greybox.py
or in the Output Log (Cmd = Python):   exec(open(unreal.Paths.project_content_dir() + 'Python/otd_build_greybox.py').read())
or console command:                    py otd_build_greybox.py

Safe to re-run: it deletes only actors tagged 'OTDGreybox' and rebuilds them.
Uses engine primitives (/Engine/BasicShapes) and creates simple colour material instances in
/Game/OTD/Greybox/Materials. No external assets.
"""
import importlib

import unreal

import otd_greybox_layout as L

importlib.reload(L)

MAP = '/Game/OTD/Maps/L_WadiAlSukoon_Mobile'
MAT_DIR = '/Game/OTD/Greybox/Materials'
TAG = 'OTDGreybox'
LABEL_YAW = 180.0   # labels face south (towards the entrance). If text reads mirrored, set 0.
GAME_MODE = '/Script/OmanDarkSide.OTDGameMode'

eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
EAL = unreal.EditorAssetLibrary
MEL = unreal.MaterialEditingLibrary

MESHES = {
    'box': unreal.load_asset('/Engine/BasicShapes/Cube.Cube'),
    'cylinder': unreal.load_asset('/Engine/BasicShapes/Cylinder.Cylinder'),
    'cone': unreal.load_asset('/Engine/BasicShapes/Cone.Cone'),
}
BASE_MAT = unreal.load_asset('/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial')


def log(msg):
    unreal.log('[OTD greybox] ' + msg)


def rot(pitch=0.0, yaw=0.0):
    r = unreal.Rotator()
    r.pitch, r.yaw, r.roll = pitch, yaw, 0.0
    return r


def ensure_material(key, color):
    name = 'MI_GB_' + key
    path = f'{MAT_DIR}/{name}'
    if EAL.does_asset_exist(path):
        mi = unreal.load_asset(path)
    else:
        tools = unreal.AssetToolsHelpers.get_asset_tools()
        mi = tools.create_asset(name, MAT_DIR, unreal.MaterialInstanceConstant,
                                unreal.MaterialInstanceConstantFactoryNew())
    MEL.set_material_instance_parent(mi, BASE_MAT)
    ok = MEL.set_material_instance_vector_parameter_value(mi, 'Color', unreal.LinearColor(*color, 1.0))
    if not ok:
        unreal.log_warning(f'[OTD greybox] {name}: parent has no "Color" parameter; shapes will be default grey')
    MEL.update_material_instance(mi)
    EAL.save_loaded_asset(mi)
    return mi


def open_or_create_map():
    if EAL.does_asset_exist(MAP):
        les.load_level(MAP)
        removed = 0
        for a in eas.get_all_level_actors():
            if a.actor_has_tag(TAG):
                eas.destroy_actor(a)
                removed += 1
        log(f'opened existing map, removed {removed} old greybox actors')
    else:
        if not les.new_level(MAP):
            raise RuntimeError('could not create ' + MAP)
        log('created ' + MAP)


def tag(actor, area, extra=()):
    actor.set_editor_property('tags', [unreal.Name(TAG)] + [unreal.Name(t) for t in extra])
    actor.set_folder_path('OTD_Greybox/' + area)


def spawn_piece(p, mats):
    a = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(p['x'], p['y'], p['z']),
                                   rot(p['pitch'], p['yaw']))
    a.set_actor_label(f"GB_{p['area'].split(' ')[0]}_{p['name']}")
    a.set_actor_scale3d(unreal.Vector(p['sx'] / 100.0, p['sy'] / 100.0, p['sz'] / 100.0))
    smc = a.static_mesh_component
    smc.set_static_mesh(MESHES[p['shape']])
    smc.set_material(0, mats[p['color']])
    if not p['collide']:
        smc.set_collision_profile_name('NoCollision')
    if p['area'] == 'Characters':
        smc.set_cast_shadow(False)
    if p['hidden']:
        a.set_actor_hidden_in_game(True)
    tag(a, p['area'], p['tags'])
    return a


def spawn_label(text, x, y, z):
    a = eas.spawn_actor_from_class(unreal.TextRenderActor, unreal.Vector(x, y, z), rot(0, LABEL_YAW))
    a.set_actor_label('GB_Label_' + text.split('\n')[0][:32])
    tr = a.text_render
    tr.set_text(text)
    tr.set_editor_property('horizontal_alignment', unreal.HorizTextAligment.EHTA_CENTER)
    tr.set_world_size(140.0 if z > 300 else 45.0)
    c = unreal.Color()
    c.r, c.g, c.b, c.a = 255, 240, 200, 255
    tr.set_text_render_color(c)
    tag(a, 'Labels')


def spawn_environment():
    """Basic mobile-friendly lighting: one movable sun, sky light, atmosphere, light fog."""
    sun = eas.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 3000), rot(-40, 135))
    sun.set_actor_label('GB_Sun')
    lc = sun.get_component_by_class(unreal.DirectionalLightComponent)
    lc.set_mobility(unreal.ComponentMobility.MOVABLE)
    lc.set_intensity(6.0)
    lc.set_editor_property('atmosphere_sun_light', True)
    tag(sun, 'Lighting')

    sky = eas.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 2000), rot())
    sky.set_actor_label('GB_SkyLight')
    sc = sky.get_component_by_class(unreal.SkyLightComponent)
    sc.set_mobility(unreal.ComponentMobility.MOVABLE)
    tag(sky, 'Lighting')

    for cls, label in ((unreal.SkyAtmosphere, 'GB_SkyAtmosphere'), (unreal.ExponentialHeightFog, 'GB_Fog')):
        a = eas.spawn_actor_from_class(cls, unreal.Vector(0, 0, 0), rot())
        a.set_actor_label(label)
        tag(a, 'Lighting')

    nav = eas.spawn_actor_from_class(unreal.NavMeshBoundsVolume, unreal.Vector(0, 0, 500), rot())
    nav.set_actor_label('GB_NavMeshBounds')
    nav.set_actor_scale3d(unreal.Vector(L.MAP_HALF / 100.0, L.MAP_HALF / 100.0, 15.0))  # default brush is 200 cm
    tag(nav, 'Navigation')


def spawn_player_start():
    x, y, z, yaw = L.RASHID_SPAWN
    ps = eas.spawn_actor_from_class(unreal.PlayerStart, unreal.Vector(x, y, z), rot(0, yaw))
    ps.set_actor_label('GB_PlayerStart_Rashid')
    ps.set_editor_property('player_start_tag', unreal.Name('Rashid'))
    tag(ps, 'Characters', ('OTD.Spawn.Rashid',))


def set_game_mode():
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    gm = unreal.load_class(None, GAME_MODE)
    if gm is None:
        unreal.log_warning('[OTD greybox] OTDGameMode not found (C++ module not compiled?); '
                           'project default game mode in DefaultEngine.ini still applies')
        return
    world.get_world_settings().set_editor_property('default_game_mode', gm)


def main():
    missing = [k for k, v in MESHES.items() if v is None] + ([] if BASE_MAT else ['BasicShapeMaterial'])
    if missing:
        raise RuntimeError('engine basic shapes missing: ' + ', '.join(missing))
    pieces, labels = L.build()
    problems = L.self_check()
    if problems:
        raise RuntimeError('layout self-check failed: ' + '; '.join(problems))
    mats = {k: ensure_material(k, c) for k, c in L.COLORS.items()}
    open_or_create_map()
    with unreal.ScopedSlowTask(len(pieces) + len(labels), 'Building greybox') as task:
        task.make_dialog(True)
        for p in pieces:
            spawn_piece(p, mats)
            task.enter_progress_frame(1)
        for t in labels:
            spawn_label(*t)
            task.enter_progress_frame(1)
    spawn_environment()
    spawn_player_start()
    set_game_mode()
    if not les.save_current_level():
        raise RuntimeError('save failed for ' + MAP)
    log(f'done: {len(pieces)} shapes, {len(labels)} labels, saved {MAP}')


main()
