// Owner-supplied demonstration images, reviewed 2026-10-06. Lossless conversion; no blur.
export const productMedia = [
  {
    "id": "informes",
    "title": "Informes de gestión",
    "caption": "Indicadores y análisis para leer la actividad del negocio.",
    "src": "/media/transgest/informes.webp",
    "width": 1448,
    "height": 1086,
    "sha256": "174b2911db31ac6faf3f60dfe767de37652d182bfb2ad7b1b11b022b77d6d628",
    "sourceSha256": "70447dd3a0d5ba9a283ce67a983aba288b95f5b363484e170f4aa1ce681b74da"
  },
  {
    "id": "finanzas",
    "title": "Gestión financiera",
    "caption": "Facturación, cobros, pagos y tesorería conectados.",
    "src": "/media/transgest/finanzas.webp",
    "width": 1448,
    "height": 1086,
    "sha256": "dd5b3616aa3e20610085473ff5ef84134f4450111bb04dfe4ac1138346a7de5a",
    "sourceSha256": "3091fe32ddec33bcdf91cd83e36e6f2879653ed723257794691f856527389d72"
  },
  {
    "id": "mesa-nueva",
    "title": "Mesa de tráfico",
    "caption": "Planificación de vehículos, conductores y servicios.",
    "src": "/media/transgest/mesa-nueva.webp",
    "width": 1448,
    "height": 1086,
    "sha256": "c0e741cb4c1f6665d43d24acf6c4d44e1524bc0612f8430d13996f81fff8670c",
    "sourceSha256": "60459dc5391d3eb1337d292fae203eef094bbae9d7cf207bcc2c4542d974bcb6"
  },
  {
    "id": "pedidos",
    "title": "Pedidos y tráfico",
    "caption": "Pedidos, estados e incidencias sobre una misma operativa.",
    "src": "/media/transgest/pedidos.webp",
    "width": 1448,
    "height": 1086,
    "sha256": "f4126c526847b9f823f1f87c4efe397ff63b3fc7afdde26a11c68877de782c01",
    "sourceSha256": "3951d511e48db7b07bcbc99758ea4f5be036f2a1361a1fa56ba1e473732dd4a4"
  },
  {
    "id": "dashboard",
    "title": "Dashboard",
    "caption": "Actividad, vencimientos y control operativo en una vista.",
    "src": "/media/transgest/dashboard.webp",
    "width": 1448,
    "height": 1086,
    "sha256": "488ba20ee2caeaaa768e3dbf328ab2c087c9454f8076fd235ee5e8488671a9f9",
    "sourceSha256": "2b46262402c4089d1e290fcfc76aec04d9bbb4e3cbd765b45ceddf885eef512a"
  },
  {
    "id": "planner-stock",
    "title": "Almacén y stock",
    "caption": "Referencias, ubicaciones, reservas y preparación de mercancía.",
    "src": "/media/transgest/planner-stock.webp",
    "width": 1448,
    "height": 1086,
    "sha256": "87173d8dda3d6eb8eab5e544900c7ae55e8dcbf0d41c339ae2d1ba13279a9d98",
    "sourceSha256": "34b079f4851f243c97dcdef2c7ab242a24731cfc724f96e785cd0dea9d4505e2"
  },
  {
    "id": "planner-cargas",
    "title": "Planificación de cargas",
    "caption": "Muelles, franjas horarias y cargas pendientes.",
    "src": "/media/transgest/planner-cargas.webp",
    "width": 1448,
    "height": 1086,
    "sha256": "9b9b66dddcb946193ef627a37eb1df474ccde674db0caaaaa5516413cd26f1c2",
    "sourceSha256": "3b876be0bdcb5bd51059e017d6131da7cf544a985e245fb5e26bbf153429b01f"
  },
  {
    "id": "deca-demo",
    "title": "DeCA de demostración",
    "caption": "Documento de demostración TransGest con identificadores ficticios.",
    "src": "/media/transgest/deca-demo.webp",
    "width": 1149,
    "height": 1368,
    "sha256": "d225cf92d716a250524c75c86fe7bae6771908ac04e978ae574d83552bdb45ff",
    "sourceSha256": "63ed3a681fbb9034025fdec1326a46762d6633ea9462c0cef0ebe0a9715a73a1"
  }
];
export const productScreens = productMedia.filter(item => !item.id.startsWith('planner-') && item.id !== 'deca-demo');
