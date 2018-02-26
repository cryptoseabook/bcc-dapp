App = {
  web3Provider: null,
  contracts: {},
  c_owner: "0x0",
  account: "0x0",
  loading: false,

  init: function() {    
    return App.initWeb3();
  },

  initWeb3: function() {
    
    if (typeof web3 !== 'undefined') {
      console.log(web3.version);
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // set the provider you want from Web3.providers
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    /*    
    App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    web3 = new Web3(App.web3Provider);
    */
    return App.initContract();
  },

  initContract: function() {    
    $.getJSON('BCCToken.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var bccTokenArtifact = data;
      App.contracts.BCCToken = TruffleContract(bccTokenArtifact);

      // Set the provider for our contract.
      App.contracts.BCCToken.setProvider(App.web3Provider);


      $.getJSON('BCCRoomBooking.json', function(data) {
        // Get the necessary contract artifact file and instantiate it with truffle-contract.
        var bccRoomBookingArtifact = data;        
        App.contracts.BCCRoomBooking = TruffleContract(bccRoomBookingArtifact);
  
        // Set the provider for our contract.
        App.contracts.BCCRoomBooking.setProvider(App.web3Provider);
  
        var bccRoomBookingInstance;

        return App.contracts.BCCRoomBooking.deployed().then(function(instance) {
          bccRoomBookingInstance = instance;          
          App.listenToEvents(); 
          return bccRoomBookingInstance.getOwner();          
        }).then(function(owner){
          App.c_owner = owner;
          App.getBalances(owner);                   
          App.reloadRooms();
        })
        
      });
      
    });    

  },


  getBalances: function(coinbase) {
    console.log('Getting balances...');

    var bccTokenInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      App.account = account;

      App.contracts.BCCToken.deployed().then(function(instance) {
        bccTokenInstance = instance;

        return bccTokenInstance.balanceOf(account);
      }).then(function(result) {
        balance = result.c[0];

        if (account == coinbase) {
          $('#offer-room').show();
        } else {
          $('#offer-room').hide();
        }

        $('#account').text(account);
        $('#accountBalance').text(balance + " BCCT");
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  offerRoom: function() {

    console.log("offer room");
    // retrieve details of the room
    var _room_name = $("#room-name").val();
    var _room_price = parseFloat($("#room-price").val() )|| 0;
    var _room_description = $("#room-description").val();
    var _room_size = $("#room-size").val();
    

    if ((_room_name.trim() === '') || (_room_price === 0)) {
      // nothing to sell
      return false;
    }

    return App.contracts.BCCRoomBooking.deployed().then(function(instance) {
      instance.openRoomBooking(_room_name, 
        _room_description, _room_size, _room_price, {
          from: web3.eth.accounts[0],
          gas: 500000
        });    
    }).then(function(result){
      console.log(result);
    }).catch(function(err){
      console.error(err);
    }) 
    
  },

  reloadRooms: function() {
    // avoid reentry
    if (App.loading) {
      return;
    }
    App.loading = true;

    // refresh account information because the balance may have changed

    var appInstance;

    App.contracts.BCCRoomBooking.deployed().then(function(instance) {
      appInstance = instance;
      return appInstance.getRoomsForBooking();
    }).then(function(roomIds) {
      // Retrieve and clear the room placeholder
      var roomRow = $('#roomsRow');
      roomRow.empty();

      for (var i = 0; i < roomIds.length; i++) {
        var roomId = roomIds[i];
        appInstance.rooms(roomId).then(function(room) {
          App.displayRoom(
            room[0], // id
            room[1], // owner
            room[2], // booking person
            room[3], // name
            room[4], // desc
            room[5], // size
            room[6] // price
          );
        });
      }
      App.loading = false;
    }).catch(function(err) {
      console.log(err.message);
      App.loading = false;
    });
  },

  listenToEvents: function() {
    var roomInstance;
    var openRoomEvent;
    App.contracts.BCCRoomBooking.deployed().then(function(instance) {

      roomInstance = instance;
      openRoomEvent = roomInstance.openRoomBookingEvent({from: App.c_owner}, {fromBlock: 0, toBlock: 'latest'});
      openRoomEvent.watch(function(error, result) {
        App.reloadRooms();
      });
    });

    App.contracts.BCCRoomBooking.deployed().then(function(instance) {

      roomInstance = instance;
      bookingRoomEvent = roomInstance.bookingRoomEvent({}, {fromBlock: 0, toBlock: 'latest'});
      bookingRoomEvent.watch(function(error, result) {
        App.getBalances();
        App.reloadRooms();
      });
    });
  },

  displayRoom: function(id, owner, bookingPerson, name, description, size, price) {
    var roomsRow = $('#roomsRow');

    // Retrieve and fill the room template
    var roomTemplate = $('#roomTemplate');
    roomTemplate.find('.panel-title').text(name);
    roomTemplate.find('.room-price').text(price);
    roomTemplate.find('.room-size').text(size);
    roomTemplate.find('.room-description').text(description);
    roomTemplate.find('.btn-booking').attr('data-id', id);
    roomTemplate.find('.btn-booking').attr('data-value', price);

    if (owner == App.account) {
      var bookingPersonAddress = bookingPerson.substring(0, 5) + "..." + bookingPerson.slice(-5);
      roomTemplate.find('.room-booked-by').text(bookingPersonAddress);
      roomTemplate.find('.btn-booking').prop("disabled",true);      
      if (bookingPerson.slice(-5).toString() != "00000") {
        roomTemplate.find('.panel-body').addClass("booked");
        roomTemplate.find('.btn-booking').text("Booked");
      } else {
        roomTemplate.find('.panel-body').removeClass("booked");
        roomTemplate.find('.btn-booking').text("Available");
      }
      
    } else {
      if (bookingPerson == "0x0000000000000000000000000000000000000000") {
        roomTemplate.find('.room-booked-by').text("n/a");
        roomTemplate.find('.btn-booking').text("Available");
        roomTemplate.find('.btn-booking').addClass("btn-success");
        roomTemplate.find('.btn-booking').prop("disabled",false);
      } else {
        roomTemplate.find('.room-booked-by').text(bookingPerson.substring(0, 5) + "..." + bookingPerson.slice(-5));
        roomTemplate.find('.btn-booking').text("Booked");
        roomTemplate.find('.btn-booking').prop("disabled",true);
        
      }
      
      
    }
    

    // add this new room
    roomsRow.append(roomTemplate.html());
  },

  bookRoom: function() {
    event.preventDefault();

    // retrieve the room price
    var _roomId = $(event.target).data('id');
    var _price = parseFloat($(event.target).data('value'));

    App.contracts.BCCRoomBooking.deployed().then(function(instance) {
      var bccRoomBookingInstance = instance;
      App.contracts.BCCToken.deployed().then(function(instance) {
        var bccTokenInstance = instance;        
        bccRoomBookingInstance.bookRoom(_roomId, _price, bccTokenInstance.address, {from: App.account, gas: 500000});
      }).then(result => console.log(result))
        .catch(err => console.error(err));
    }).then(result => console.log(result))
      .catch(err => console.error(err));
  },
};


$(function() {
  $(window).load(function() {
    App.init();
  });
});
