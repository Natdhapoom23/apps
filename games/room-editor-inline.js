// Keep a selected room row visually connected to its configuration panel.
let pendingRow=null;
function connect(){const editor=document.querySelector('#editor');if(!pendingRow||!editor||editor.hidden)return;document.querySelectorAll('#rooms>.room').forEach(item=>item.classList.remove('room-selected'));pendingRow.classList.add('room-selected');pendingRow.after(editor);pendingRow=null;}
document.addEventListener('click',event=>{
  const button=event.target.closest('#rooms button,[data-code]');
  if(!button||button.matches('[data-delete],[data-delete-room]'))return;
  const row=button.closest('.room');
  if(!row)return;
  pendingRow=row;setTimeout(connect,0);
});
new MutationObserver(connect).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
