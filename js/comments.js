$(document).ready(function()
{
    function comment_callback(data)
    {
        alert(data);
    }
    $('.add_comment').click(function(){
        $.ajax({
            type: 'POST',
            url: 'http://localhost:5000/add_comment',
            data: '123',
            success: comment_callback,
        });
    });
});
