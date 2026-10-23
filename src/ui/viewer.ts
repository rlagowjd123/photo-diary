/** 사진을 화면 가득 크게 본다. 누르면 닫힌다. */
export function openViewer(url: string): void {
  const v = document.createElement('div');
  v.className = 'viewer';
  v.setAttribute('role', 'dialog');
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  v.appendChild(img);
  v.addEventListener('click', () => v.remove());
  document.body.appendChild(v);
}
