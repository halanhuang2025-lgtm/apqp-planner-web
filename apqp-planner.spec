# -*- mode: python ; coding: utf-8 -*-
# APQP 项目计划生成器 - PyInstaller 打包配置 (onedir 模式)

import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# 收集 uvicorn 和 fastapi 的隐藏导入
hiddenimports = [
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    'email.mime.text',
    'email.mime.multipart',
]

a = Analysis(
    ['backend/main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('backend/core', 'core'),
        ('backend/templates', 'templates'),
        ('dist', 'dist'),
    ],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='APQP计划生成器-Web版',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=True,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/icon.icns',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='APQP计划生成器-Web版',
)

app = BUNDLE(
    coll,
    name='APQP计划生成器-Web版.app',
    icon='assets/icon.icns',
    bundle_identifier='com.hualian.apqp-planner',
    info_plist={
        'CFBundleName': 'APQP计划生成器-Web版',
        'CFBundleDisplayName': 'APQP计划生成器-Web版',
        'CFBundleVersion': '2.1.0',
        'CFBundleShortVersionString': '2.1.0',
        'NSHighResolutionCapable': True,
    },
)
