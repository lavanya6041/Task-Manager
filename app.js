const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

const config = require("./config.json");
const mongopwd = config.PASSWORD;
mongoose.set('strictQuery', false);
mongoose.connect("mongodb+srv://chinmaybhalodia:"+mongopwd+"@cluster0.kmd0l5u.mongodb.net/todoDB",()=>{
    console.log("Database Connected.");
});

const itemSchema = {
    name : {
        type:String,
        required: [true, "Please enter a task"]
    }
};

const Item = mongoose.model("item",itemSchema);

const defaultItems = [];

defaultItems.push(new Item({
    name: "Click + to add new item."
}));

defaultItems.push(new Item({
    name: "<--- Click to delete this item."
}));

const listSchema = {
    title: {
        type: String,
        required: true
    },
    items: [itemSchema]
}

const List = mongoose.model("list", listSchema);

let day = "";
let allLists = new Set();

app.get("/",(req,res)=>{
    let today = new Date();
    let options = {
        weekday: "long",
        day: "numeric",
        month: "numeric",
        year: "numeric"
    };
    day = today.toLocaleDateString("en-IN", options);

    allLists.clear();
    List.find({}, (err, items)=>{
        items.forEach((item)=>{
            allLists.add(item.title);
        });
    });

    Item.find({}, (err, items)=>{
        if(items.length === 0){
            Item.insertMany(defaultItems,(err)=>{
                if(err){
                    console.log(err);
                } else{
                    console.log("Inserted Default Items");
                }
            });
            res.redirect("/");
        }
        if(err){
            console.log(err);
        } else{
            res.render("list",{
                listTitle: day,
                newListItems: items,
                lists : allLists
            });
        }
    });
});

app.post("/",(req,res)=>{
    const newItem = new Item({
        name: req.body.newItem
    });
    const listName = req.body.list;

    if(listName === day){
        newItem.save();
        res.redirect("/");
    } else{
        List.findOne({title:listName}, (err,list)=>{
            list.items.push(newItem);
            list.save();
            res.redirect("/"+listName);
        });
    }
});

app.post("/create",(req,res)=>{
    const listName = req.body.newList;
    res.redirect("/"+listName);
});

app.post("/delete",(req,res)=>{
    const listName = req.body.listName;

    if(listName === day){
        Item.deleteOne({_id: req.body.checkbox}, (err)=>{
            if(err){
                console.log(err);
            } else{
                console.log("Item Deleted.");
                res.redirect("/");
            }
        });
    } else{
        List.findOne({title:listName},(err,list)=>{
            List.updateOne({title:listName},{$pull: {items: {_id : req.body.checkbox}}}, (err)=>{
                if(err){
                    console.log(err);
                }
            });
            res.redirect("/"+listName);
        });
    }
});

app.get("/:listName",(req,res)=>{
    const listName = _.capitalize(req.params.listName);
    List.findOne({title:listName}, (err,list)=>{
        if(!err){
            if(!list){
                console.log("No such list. Creating New...");
                allLists.add(listName);
                const list = new List({
                    title: listName,
                    items: defaultItems
                }).save(()=>{
                    res.redirect("/"+listName);
                });
            } else{

                res.render("list",{
                    listTitle: list.title,
                    newListItems: list.items,
                    lists: allLists
                });
            }
        } else{
            console.log(err);
        }
    });
});

app.listen(3000,()=>{
    console.log("Server running on port 3000.");
});