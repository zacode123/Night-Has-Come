declare module 'exif-js' {
  function getData(
    img: HTMLImageElement | string | File | Blob,
    callback: () => void
  ): void;
  function getTag(img: any, tag: any): any;
  function getAllTags(img: any): any;
  export { getData, getTag, getAllTags };
}
