"use client";

import { deletePhoto, getPhotoDetail, listPhotos, updatePhoto } from "@/server/actions/photos";

/** The server actions the Photos UI calls. Injectable so the dev preview can run without a database. */
export type PhotoActions = {
  listPhotos: typeof listPhotos;
  getPhotoDetail: typeof getPhotoDetail;
  updatePhoto: typeof updatePhoto;
  deletePhoto: typeof deletePhoto;
};

export const serverPhotoActions: PhotoActions = { listPhotos, getPhotoDetail, updatePhoto, deletePhoto };
